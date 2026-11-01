import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { MetricsService } from '../src/modules/health/metrics.service';

describe('DARB Phase 7 — P7-002: Production Config Harmonization & Ingress Hardening', () => {
  const testMetricsToken = 'sec-metrics-bearer-token-1234567890';

  describe('Suite A: Standard Environment (No COOKIE_DOMAIN, No METRICS_AUTH_TOKEN)', () => {
    let app: INestApplication;

    beforeAll(async () => {
      delete process.env.COOKIE_DOMAIN;
      delete process.env.METRICS_AUTH_TOKEN;
      process.env.DATABASE_URL =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public';
      process.env.SESSION_SECRET =
        process.env.SESSION_SECRET || 'super-secret-key-that-is-at-least-32-characters-long!';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.setGlobalPrefix('api/v1');

      const metricsService = app.get(MetricsService);
      app.useGlobalInterceptors(new RequestIdInterceptor(), new TransformResponseInterceptor());
      app.useGlobalFilters(new AllExceptionsFilter(metricsService));
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('Login sets host-only session cookie when COOKIE_DOMAIN is absent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.ahmed',
          password: 'Darap123456!',
        })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies[0];
      expect(cookieStr).toContain('darb_session=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
      expect(cookieStr.toLowerCase()).toContain('path=/');
      // Assert no Domain attribute is emitted
      expect(cookieStr.toLowerCase()).not.toContain('domain=');
    });

    it('Logout clears session cookie without Domain attribute when COOKIE_DOMAIN is absent', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.ahmed',
          password: 'Darap123456!',
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      const clearCookie = logoutRes.headers['set-cookie'][0];
      expect(clearCookie).toContain('darb_session=;');
      expect(clearCookie.toLowerCase()).toContain('path=/');
      expect(clearCookie.toLowerCase()).not.toContain('domain=');
    });

    it('GET /api/v1/health/metrics is accessible when METRICS_AUTH_TOKEN is not configured', async () => {
      const jsonRes = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(200);
      expect(jsonRes.body.success).toBe(true);
      expect(jsonRes.body.data.service).toBe('darb-api');

      const promRes = await request(app.getHttpServer())
        .get('/api/v1/health/metrics?format=prometheus')
        .expect(200);
      expect(promRes.headers['content-type']).toContain('text/plain');
      expect(promRes.text).toContain('darb_process_uptime_seconds');
    });
  });

  describe('Suite B: Hardened Ingress Environment (With COOKIE_DOMAIN & METRICS_AUTH_TOKEN)', () => {
    let app: INestApplication;

    beforeAll(async () => {
      process.env.COOKIE_DOMAIN = '.darb.local';
      process.env.METRICS_AUTH_TOKEN = testMetricsToken;
      process.env.DATABASE_URL =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public';
      process.env.SESSION_SECRET =
        process.env.SESSION_SECRET || 'super-secret-key-that-is-at-least-32-characters-long!';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.setGlobalPrefix('api/v1');

      const metricsService = app.get(MetricsService);
      app.useGlobalInterceptors(new RequestIdInterceptor(), new TransformResponseInterceptor());
      app.useGlobalFilters(new AllExceptionsFilter(metricsService));
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      await app.init();
    });

    afterAll(async () => {
      delete process.env.COOKIE_DOMAIN;
      delete process.env.METRICS_AUTH_TOKEN;
      if (app) {
        await app.close();
      }
    });

    it('Login sets session cookie with explicit Domain attribute matching COOKIE_DOMAIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.layla',
          password: 'Darap123456!',
        })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies[0];
      expect(cookieStr).toContain('darb_session=');
      expect(cookieStr.toLowerCase()).toContain('domain=.darb.local');
      expect(cookieStr.toLowerCase()).toContain('httponly');
      expect(cookieStr.toLowerCase()).toContain('path=/');
    });

    it('Logout clears session cookie with matching Domain attribute', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.layla',
          password: 'Darap123456!',
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      const clearCookie = logoutRes.headers['set-cookie'][0];
      expect(clearCookie).toContain('darb_session=;');
      expect(clearCookie.toLowerCase()).toContain('domain=.darb.local');
      expect(clearCookie.toLowerCase()).toContain('path=/');
    });

    it('GET /api/v1/health/metrics rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Metrics authentication required');
      // Ensure the secret token is never leaked in the error payload
      expect(JSON.stringify(res.body)).not.toContain(testMetricsToken);
    });

    it('GET /api/v1/health/metrics rejects requests with non-Bearer authorization scheme', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .set('Authorization', `Basic ${Buffer.from(`user:${testMetricsToken}`).toString('base64')}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authorization format');
      expect(res.body.message).toContain('Bearer');
      expect(JSON.stringify(res.body)).not.toContain(testMetricsToken);
    });

    it('GET /api/v1/health/metrics rejects requests with invalid or incorrect Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .set('Authorization', 'Bearer incorrect-token-1234567890')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid metrics authorization token');
      expect(JSON.stringify(res.body)).not.toContain(testMetricsToken);
    });

    it('GET /api/v1/health/metrics rejects query parameter token bypass attempts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/health/metrics?token=${testMetricsToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Metrics authentication required');
    });

    it('GET /api/v1/health/metrics returns 200 with valid Bearer token for JSON format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .set('Authorization', `Bearer ${testMetricsToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('darb-api');
      expect(res.body.data.memory).toBeDefined();
      expect(res.body.data.http).toBeDefined();
    });

    it('GET /api/v1/health/metrics returns 200 with valid Bearer token for Prometheus format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics?format=prometheus')
        .set('Authorization', `Bearer ${testMetricsToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP darb_http_requests_total');
      expect(res.text).toContain('darb_process_uptime_seconds');
    });

    it('Other health endpoints (/live, /ready, /dependencies) remain unhindered and publicly accessible', async () => {
      const liveRes = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
      expect(liveRes.body.data.status).toBe('ok');

      const readyRes = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
      expect(readyRes.body.data.status).toBe('ready');

      const depsRes = await request(app.getHttpServer())
        .get('/api/v1/health/dependencies')
        .expect(200);
      expect(['ok', 'degraded']).toContain(depsRes.body.data.status);
    });
  });
});
