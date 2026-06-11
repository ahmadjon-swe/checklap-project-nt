import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Register BEFORE NestFactory.create so rejections that occur during module
  // initialization (e.g. Telegraf getMe when the network is unreachable) are
  // caught here instead of crashing the process with Node's default exit.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason as any);
  });

  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const isProduction = config.get('NODE_ENV') === 'production';

  app.use(helmet());
  app.use(cookieParser());

  const frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: isProduction
      ? frontendUrl
      : [frontendUrl, 'http://localhost:3000', 'http://0.0.0.0:3000'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Swagger documents the entire API surface — keep it out of production.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('QuizApp API')
      .setDescription('Production-grade SaaS exam platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refreshToken')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`🚀 Backend running on http://localhost:${port}/api`);
  if (!isProduction) {
    logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
  }
}
void bootstrap();
