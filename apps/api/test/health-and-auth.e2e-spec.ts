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

describe('DARB API: Health & Auth E2E Tests', () => {
  let app: INestApplication;

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
    app.useGlobalInterceptors(new RequestIdInterceptor(), new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
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

  describe('Health Endpoints', () => {
    it('GET /api/v1/health/live returns 200 with status ok and request-id header', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/v1/health/ready returns 200 when database is connected', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    });
  });

  describe('Authentication Lifecycle', () => {
    it('POST /api/v1/auth/login returns 401 on incorrect password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.ahmed',
          password: 'IncorrectPassword!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('POST /api/v1/auth/login returns 400 on malformed input (DTO validation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'ab', // too short (<3 chars)
          password: '',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login succeeds for seeded teacher and sets HTTP-only cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'teacher.ahmed',
          password: 'Darap123456!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('teacher.ahmed');
      expect(res.body.data.activeTenant.tenantSlug).toBe('al-andalus');

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies[0];
      expect(cookieStr).toContain('darb_session=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
    });

    it('GET /api/v1/auth/me returns current user profile when session cookie is provided', async () => {
      // First login to get cookie
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'student.tariq',
          password: 'Darap123456!',
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'];

      // Call /me with cookie
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.username).toBe('student.tariq');
      expect(meRes.body.data.user.role).toBe('STUDENT');
      expect(meRes.body.data.user.email).toBeNull(); // Students login without personal email!
      expect(meRes.body.data.activeTenant.tenantSlug).toBe('al-andalus');
    });

    it('POST /api/v1/auth/logout clears session cookie', async () => {
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

      expect(logoutRes.body.success).toBe(true);
      const clearCookie = logoutRes.headers['set-cookie'][0];
      expect(clearCookie).toContain('darb_session=;');
    });
  });
});
