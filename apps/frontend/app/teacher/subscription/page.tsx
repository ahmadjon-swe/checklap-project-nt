'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Crown, Gem, Zap, Check, ArrowRight, Sparkles,
  BarChart2, Users, FileText, Shield, Download, Upload,
  Headphones, Globe, Layers, Key,
} from 'lucide-react';
import api from '../../../lib/api';
import { usePremiumStore, PlanTier } from '../../../store/premium.store';
import { Button } from '../../../components/ui/button';

const plans = [
  {
    id: 'pro',
    tier: 'pro' as PlanTier,
    name: 'Pro',
    tagline: 'For serious educators',
    price: 29,
    period: 'month',
    icon: Crown,
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-500/30',
    border: 'pricing-pro',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    ctaClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 bg-[length:200%_auto] bg-left hover:bg-right text-white shadow-xl shadow-amber-500/40 hover:shadow-amber-500/60',
    activeCtaClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
    checkColor: 'text-amber-500',
    popular: true,
    features: [
      { icon: FileText, text: 'Unlimited tests & questions' },
      { icon: Users, text: 'Up to 500 students' },
      { icon: BarChart2, text: 'Advanced analytics dashboard' },
      { icon: Download, text: 'Export results to CSV/PDF' },
      { icon: Upload, text: 'Import questions from files' },
      { icon: Shield, text: 'Priority email support' },
    ],
  },
  {
    id: 'enterprise',
    tier: 'enterprise' as PlanTier,
    name: 'Enterprise',
    tagline: 'For institutions & teams',
    price: 99,
    period: 'month',
    icon: Gem,
    gradient: 'from-rose-900 via-red-700 to-amber-500',
    glow: 'shadow-rose-900/40',
    border: 'pricing-enterprise',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    ctaClass: 'bg-gradient-to-r from-rose-800 via-red-600 to-amber-500 bg-[length:200%_auto] bg-left hover:bg-right text-white shadow-xl shadow-rose-800/40 hover:shadow-rose-700/60',
    activeCtaClass: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
    checkColor: 'text-rose-600',
    popular: false,
    features: [
      { icon: FileText, text: 'Everything in Pro' },
      { icon: Users, text: 'Unlimited students & teams' },
      { icon: Globe, text: 'Custom domain & white-label' },
      { icon: Key, text: 'Full API access' },
      { icon: Layers, text: 'Team collaboration tools' },
      { icon: Headphones, text: 'Dedicated account manager' },
    ],
  },
];

const freeFeatures = [
  '5 tests per month',
  'Up to 30 students',
  'Basic analytics',
  'Community support',
];

export default function SubscriptionPage() {
  const { tier: activeTier, setPlan } = usePremiumStore();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const { data: currentRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => api.get('/subscriptions/me').then((r) => r.data.data).catch(() => null),
  });

  const manualMutation = useMutation({
    mutationFn: (planId: string) => api.post('/subscriptions/manual-request', { planId }),
  });
  const cancelMutation = useMutation({
    mutationFn: () => api.post('/subscriptions/cancel'),
  });

  const discount = billing === 'annual' ? 0.8 : 1;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 mb-6">
          <Sparkles size={13} className="text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Choose Your Plan</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upgrade to unlock{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">premium features</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-3 text-base">
          Join 10,000+ educators delivering world-class assessments.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 mt-6 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
          {(['monthly', 'annual'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                billing === b
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual'}
              {b === 'annual' && (
                <span className="ml-2 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">-20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current plan banner */}
      {currentRes?.status === 'active' && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active subscription</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Status: <span className="font-medium text-emerald-600 dark:text-emerald-400 capitalize">{currentRes.status}</span>
              {currentRes.endsAt && ` · Expires ${new Date(currentRes.endsAt).toLocaleDateString()}`}
            </p>
          </div>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="px-4 py-2 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-all"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel plan'}
          </button>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isActive = activeTier === plan.tier;
          const price = Math.round(plan.price * discount);

          return (
            <div key={plan.id} className={`relative rounded-[24px] bg-white dark:bg-slate-900 ${plan.border} p-[1px]`}>
              <div className="rounded-[23px] bg-white dark:bg-slate-900 overflow-hidden h-full flex flex-col">
                {/* Popular badge */}
                {plan.popular && (
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold uppercase tracking-widest text-center py-1.5 px-4">
                    ✦ Most Popular ✦
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  {/* Plan header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} gradient-animate flex items-center justify-center shadow-xl ${plan.glow} flex-shrink-0`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{plan.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-end gap-1.5">
                      <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">${price}</span>
                      <span className="text-slate-400 dark:text-slate-500 text-sm pb-2">/ {plan.period}</span>
                    </div>
                    {billing === 'annual' && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        Save ${(plan.price * 12 - price * 12)} per year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.features.map(({ icon: FIcon, text }) => (
                      <li key={text} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}>
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="space-y-3">
                    {isActive ? (
                      <div className={`w-full py-3 rounded-xl text-sm font-bold text-center ${plan.activeCtaClass}`}>
                        ✓ Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPlan(plan.tier); manualMutation.mutate(plan.id); }}
                        disabled={manualMutation.isPending}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 ${plan.ctaClass}`}
                      >
                        {manualMutation.isPending ? 'Processing…' : `Activate ${plan.name}`}
                        {!manualMutation.isPending && <ArrowRight size={14} className="inline ml-1.5" />}
                      </button>
                    )}
                    {isActive && activeTier !== 'free' && (
                      <button
                        onClick={() => setPlan('free')}
                        className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        Downgrade to Free
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Free tier comparison */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Zap size={18} className="text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Free plan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Get started at no cost</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {freeFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Check size={13} className="text-slate-400" />
                  {f}
                </div>
              ))}
            </div>
            {activeTier !== 'free' && (
              <button
                onClick={() => setPlan('free')}
                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 transition-all hover:border-slate-300"
              >
                Downgrade
              </button>
            )}
            {activeTier === 'free' && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">Current plan</span>
            )}
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
        {[
          { label: '10,000+', sub: 'Active educators' },
          { label: '99.9%', sub: 'Uptime SLA' },
          { label: '24/7', sub: 'Priority support' },
        ].map(({ label, sub }) => (
          <div key={label} className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 py-5">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
