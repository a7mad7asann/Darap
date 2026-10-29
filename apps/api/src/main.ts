import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('DARB-API');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';
  const webUrl = configService.get<string>('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
  const corsOriginsConfig = configService.get<string>('CORS_ALLOWED_ORIGINS');

  // Compute allowed CORS origins safely
  const allowedOrigins: string[] = [];
  if (webUrl) {
    allowedOrigins.push(webUrl);
  }
  if (corsOriginsConfig) {
    corsOriginsConfig
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => {
        if (!allowedOrigins.includes(o)) {
          allowedOrigins.push(o);
        }
      });
  }
  // Allow localhost:3000 in development/test fallback only
  if (!isProduction && !allowedOrigins.includes('http://localhost:3000')) {
    allowedOrigins.push('http://localhost:3000');
  }

  // Global Middlewares
  app.use(cookieParser());

  // CORS with credentials for cookie sessions
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
  });

  // Base path /api/v1
  app.setGlobalPrefix('api/v1');

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new RequestIdInterceptor(), new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // DTO Validation with allowlist
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // Swagger / OpenAPI documentation
  const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER') ?? !isProduction;

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DARB API')
      .setDescription('DARB Arabic-First Educational Platform REST API (v1)')
      .setVersion('1.0.0')
      .addCookieAuth('darb_session')
      .addBearerAuth()
      .addTag('Health', 'Liveness and readiness health checks')
      .addTag('Auth', 'Authentication, session management, and current user profile')
      .addTag('Teacher Courses', 'Teacher course management and student rosters')
      .addTag('Teacher Lessons', 'Lesson creation, publishing, reordering, and file attachments')
      .addTag('Teacher Join Codes', 'Cryptographic join-code generation and revocation')
      .addTag('Student Learning', 'Student course enrollment, lesson viewing, and progress')
      .addTag('Admin Provisioning', 'Administrator user provisioning and account management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    SwaggerModule.setup('api/v1/docs', app, document);
    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  } else {
    logger.log('Swagger documentation disabled for production mode.');
  }

  await app.listen(port);
  logger.log(`DARB API is running on http://localhost:${port}/api/v1`);
}

bootstrap();
