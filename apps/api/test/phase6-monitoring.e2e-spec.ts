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

describe('Phase 6 — Monitoring, Alerting & Health Probes Hardening (P6-005)', () => {
  let app: INestApplication;
  let metricsService: MetricsService;

  beforeAll(async () => {
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

    metricsService = app.get(MetricsService);
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

  describe('Health Probes Architecture', () => {
    it('Liveness probe GET /api/v1/health/live returns 200 with process state and memory usage', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.data.timestamp).toBeDefined();
      expect(res.body.data.memoryUsage).toBeDefined();
      expect(res.body.data.memoryUsage.rss).toBeGreaterThan(0);
      expect(res.body.data.memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(res.body.data.memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    it('Readiness probe GET /api/v1/health/ready returns 200 when database is connected', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
      expect(res.body.data.checks?.database).toBe('up');
      expect(res.body.data.durationMs).toBeGreaterThanOrEqual(0);
      expect(res.body.data.timestamp).toBeDefined();
      // Ensure no raw connection strings or passwords leaked
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('postgresql://');
    });

    it('Dependency health probe GET /api/v1/health/dependencies returns status for DB and storage', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/dependencies').expect(200);

      expect(res.body.success).toBe(true);
      expect(['ok', 'degraded']).toContain(res.body.data.status);
      expect(res.body.data.dependencies).toBeDefined();

      // Database dependency check
      expect(res.body.data.dependencies.database.status).toBe('up');
      expect(res.body.data.dependencies.database.latencyMs).toBeGreaterThanOrEqual(0);

      // Storage dependency check
      expect(res.body.data.dependencies.storage.status).toBe('up');
      expect(res.body.data.dependencies.storage.provider).toBeDefined();
      expect(res.body.data.dependencies.storage.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Operational Metrics Endpoint', () => {
    it('GET /api/v1/health/metrics returns JSON snapshot by default', async () => {
      // Trigger a couple requests to ensure recorded metrics
      await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

      const res = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(200);

      expect(res.body.success).toBe(true);
      const metrics = res.body.data;
      expect(metrics.service).toBe('darb-api');
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeDefined();

      // Memory metrics
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.rssBytes).toBeGreaterThan(0);
      expect(metrics.memory.heapTotalBytes).toBeGreaterThan(0);

      // HTTP metrics
      expect(metrics.http).toBeDefined();
      expect(metrics.http.totalRequests).toBeGreaterThanOrEqual(1);
      expect(metrics.http.byStatusClass['2xx']).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(metrics.http.routes)).toBe(true);
    });

    it('GET /api/v1/health/metrics?format=prometheus returns Prometheus exposition format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics?format=prometheus')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP darb_process_uptime_seconds');
      expect(res.text).toContain('# TYPE darb_process_uptime_seconds gauge');
      expect(res.text).toContain('# HELP darb_process_memory_bytes');
      expect(res.text).toContain('darb_process_memory_bytes{type="rss"}');
      expect(res.text).toContain('# HELP darb_http_requests_total');
      expect(res.text).toContain('darb_http_requests_total');
      expect(res.text).toContain('# HELP darb_http_errors_total');
    });

    it('GET /api/v1/health/metrics with Accept: text/plain returns Prometheus format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .set('Accept', 'text/plain')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('darb_process_uptime_seconds');
      expect(res.text).toContain('darb_process_memory_bytes');
    });
  });

  describe('Request ID Sanitization & Propagation', () => {
    it('accepts and echoes a clean, valid client-provided X-Request-Id header', async () => {
      const customId = 'pilot-client-trace-12345';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', customId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customId);
      expect(res.body.requestId).toBe(customId);
    });

    it('sanitizes and replaces an invalid / malicious X-Request-Id header with a fresh UUID', async () => {
      const maliciousId = '<script>alert("xss")</script>';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', maliciousId)
        .expect(200);

      const returnedId = res.headers['x-request-id'];
      expect(returnedId).not.toBe(maliciousId);
      expect(returnedId).not.toContain('<script>');
      expect(returnedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(res.body.requestId).toBe(returnedId);
    });

    it('replaces an overly long (>64 chars) X-Request-Id header with a fresh UUID', async () => {
      const longId = 'a'.repeat(128);
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', longId)
        .expect(200);

      const returnedId = res.headers['x-request-id'];
      expect(returnedId).not.toBe(longId);
      expect(returnedId.length).toBeLessThanOrEqual(64);
      expect(returnedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('Metrics Route Normalization (Cardinaity Protection)', () => {
    it('normalizes arbitrary UUIDs in route paths to prevent cardinality explosion', async () => {
      const dummyUuid1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const dummyUuid2 = 'b2c3d4e5-f6a7-8901-bcde-fa2345678901';

      // Send requests with different UUIDs to nonexistent course endpoints (resulting in 404 or auth challenge)
      await request(app.getHttpServer()).get(`/api/v1/courses/${dummyUuid1}/sections`);
      await request(app.getHttpServer()).get(`/api/v1/courses/${dummyUuid2}/sections`);

      const res = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(200);

      const routes = res.body.data.http.routes;
      // Should contain normalized template '/api/v1/courses/:id/sections'
      const rawUuidRoutes = routes.filter(
        (r: any) => r.route.includes(dummyUuid1) || r.route.includes(dummyUuid2),
      );
      expect(rawUuidRoutes).toHaveLength(0);

      const normalizedRoute = routes.find((r: any) => r.route.includes('/courses/:id/sections'));
      expect(normalizedRoute).toBeDefined();
      expect(normalizedRoute.count).toBeGreaterThanOrEqual(2);
    });
  });
});
