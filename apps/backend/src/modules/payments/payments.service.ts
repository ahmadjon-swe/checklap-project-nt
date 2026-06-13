import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {
    this.stripe = new Stripe(config.get<string>('stripe.secretKey') || '', {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  async createCheckoutSession(userId: string, planId: string, priceId: string) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/subscription`,
      metadata: { userId, planId },
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get<string>('stripe.webhookSecret') || '',
      );
    } catch (err) {
      this.logger.error(`Stripe webhook signature failed: ${err.message}`);
      throw new BadRequestException('Invalid signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, planId } = session.metadata;
      await this.subscriptionsService.activateStripeSubscription(
        userId,
        planId,
        session.subscription as string,
      );
      this.logger.log(`Subscription activated for user ${userId}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      this.logger.log(`Subscription deleted: ${sub.id}`);
    }

    return { received: true };
  }
}
