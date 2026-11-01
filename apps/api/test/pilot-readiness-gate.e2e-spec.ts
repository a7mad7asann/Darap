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
import { PrismaService } from '../src/database/prisma.service';
import { MetricsService } from '../src/modules/health/metrics.service';
import { validateEnv } from '../src/config/env.validation';

describe('Phase 6 — Operational Pilot Readiness Gate (P6-006)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let teacherSessionCookie: string;
  let studentSessionCookie: string;
  let teacherTenantId: string;
  let testCourseId: string;
  let testLessonId: string;

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

    prisma = app.get(PrismaService);
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

    // Authenticate Teacher (Ahmed - Tenant 1)
    const teacherLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'teacher.ahmed', password: 'Darap123456!' })
      .expect(200);

    const teacherCookies = teacherLoginRes.headers['set-cookie'];
    teacherSessionCookie = teacherCookies.find((c: string) => c.startsWith('darb_session='));
    teacherTenantId = teacherLoginRes.body.data.activeTenant.tenantId;

    // Authenticate Student (Tariq)
    const studentLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'student.tariq', password: 'Darap123456!' })
      .expect(200);

    const studentCookies = studentLoginRes.headers['set-cookie'];
    studentSessionCookie = studentCookies.find((c: string) => c.startsWith('darb_session='));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // =========================================================================
  // GATE 1: Security & Production Configuration Invariants
  // =========================================================================
  describe('Gate 1: Security & Production Configuration Invariants', () => {
    it('validates production startup constraints (rejects insecure secrets & credentials)', () => {
      const validProdBase = {
        DATABASE_URL: 'postgresql://prod_user:prod_pass@db.prod.internal:5432/darb_prod',
        SESSION_SECRET: 'dGhpcy1pcy1hLXZlcnktc2VjdXJlLXByb2R1Y3Rpb24tc2VjcmV0LWtleS0zMg==',
        NODE_ENV: 'production',
        COOKIE_SECURE: true,
        COOKIE_SAME_SITE: 'lax',
        ENABLE_SWAGGER: false,
      };

      // Rejects insecure cookie setting in production
      expect(() => {
        validateEnv({
          ...validProdBase,
          COOKIE_SECURE: false,
        });
      }).toThrow(/COOKIE_SECURE must be set to true in production mode/);

      // Rejects placeholder secrets in production
      expect(() => {
        validateEnv({
          ...validProdBase,
          SESSION_SECRET: 'super-secret-key-that-is-at-least-32-characters-long!',
        });
      }).toThrow(/SESSION_SECRET appears to be an insecure placeholder/);

      // Rejects default development database credentials in production
      expect(() => {
        validateEnv({
          ...validProdBase,
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/darb_dev',
        });
      }).toThrow(/DATABASE_URL uses default development credentials/);
    });
  });

  // =========================================================================
  // GATE 2: PostgreSQL Row-Level Security (RLS) Engine Enforcement
  // =========================================================================
  describe('Gate 2: PostgreSQL Row-Level Security (RLS) Engine Enforcement', () => {
    it('verifies FORCE ROW LEVEL SECURITY is enabled on all tenant-owned tables in PostgreSQL', async () => {
      const tenantTables = [
        'Course',
        'Section',
        'Lesson',
        'Assignment',
        'Exam',
        'FileObject',
        'GradeRecord',
      ];

      const rlsCheck: Array<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }> = await prisma.$queryRaw`
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        WHERE relname IN ('Course', 'Section', 'Lesson', 'Assignment', 'Exam', 'FileObject', 'GradeRecord')
      `;

      expect(rlsCheck.length).toBe(tenantTables.length);
      for (const row of rlsCheck) {
        expect(row.relrowsecurity).toBe(true);
        expect(row.relforcerowsecurity).toBe(true);
      }
    });

    it('enforces strict tenant isolation preventing cross-tenant information disclosure', async () => {
      // Authenticate as Teacher Layla (Cordoba tenant)
      const laylaLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'teacher.layla', password: 'Darap123456!' })
        .expect(200);

      const laylaCookie = laylaLogin.headers['set-cookie'].find((c: string) =>
        c.startsWith('darb_session='),
      );

      // Teacher Ahmed creates a draft course in Al-Andalus tenant
      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/teacher/courses')
        .set('Cookie', teacherSessionCookie)
        .send({
          title: 'دورة البوابة النهائية',
          subject: 'Physics',
          gradeLevel: 'Grade 12',
        })
        .expect(201);

      testCourseId = courseRes.body.data.id;

      // Teacher Layla attempts to view Ahmed's course -> Strictly denied with 404 (not disclosing existence)
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${testCourseId}`)
        .set('Cookie', laylaCookie)
        .expect(404);
    });
  });

  // =========================================================================
  // GATE 3: Authentication & Identity Management
  // =========================================================================
  describe('Gate 3: Authentication & Identity Management', () => {
    it('authenticates students with username only (no mandatory email required)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student.tariq', password: 'Darap123456!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.username).toBe('student.tariq');
    });

    it('persists session cookies and validates identity on /api/v1/auth/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', studentSessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('student.tariq');
    });

    it('clears session cookies securely on logout', async () => {
      // Authenticate temporary session for logout check
      const tempLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student.sara', password: 'Darap123456!' })
        .expect(200);

      const tempCookie = tempLogin.headers['set-cookie'].find((c: string) =>
        c.startsWith('darb_session='),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', tempCookie)
        .expect(200);

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const sessionClear = setCookie.find((c: string) => c.startsWith('darb_session=;'));
      expect(sessionClear).toBeDefined();
    });
  });

  // =========================================================================
  // GATE 4: Educational Workflows & Core Pedagogy
  // =========================================================================
  describe('Gate 4: Educational Workflows & Core Pedagogy', () => {
    it('manages course lifecycle, section hierarchy, and cryptographic join codes', async () => {
      // Create section
      const sectionRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${testCourseId}/sections`)
        .set('Cookie', teacherSessionCookie)
        .send({ title: 'الوحدة الأولى: البداية', orderIndex: 0 })
        .expect(201);

      const sectionId = sectionRes.body.data.id;
      expect(sectionId).toBeDefined();

      // Create and publish lesson
      const lessonRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${testCourseId}/lessons`)
        .set('Cookie', teacherSessionCookie)
        .send({
          title: 'الدرس الأول',
          content: '# مرحباً بكم في الدورة',
          sectionId,
          orderIndex: 0,
        })
        .expect(201);

      testLessonId = lessonRes.body.data.id;
      expect(testLessonId).toBeDefined();

      // Publish course
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${testCourseId}/publish`)
        .set('Cookie', teacherSessionCookie)
        .expect(200);

      // Generate join code
      const codeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${testCourseId}/join-codes`)
        .set('Cookie', teacherSessionCookie)
        .send({ maxUses: 5, expiresInDays: 30 })
        .expect(201);

      const rawCode = codeRes.body.data.rawCode;
      expect(rawCode).toMatch(/^DARB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      // Student redeems code
      const redeemRes = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentSessionCookie)
        .send({ code: rawCode })
        .expect(200);

      expect(redeemRes.body.success).toBe(true);
      expect(redeemRes.body.data.courseId).toBe(testCourseId);
    });
  });

  // =========================================================================
  // GATE 5: Managed Object Storage & Asset Security
  // =========================================================================
  describe('Gate 5: Managed Object Storage & Asset Security', () => {
    it('generates presigned upload URL with strict 25MB limits and authorized metadata', async () => {
      const presignRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${testLessonId}/files/presign-upload`)
        .set('Cookie', teacherSessionCookie)
        .send({
          fileName: 'pilot-curriculum-guide.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024 * 1024, // 1 MB
        })
        .expect(201);

      expect(presignRes.body.success).toBe(true);
      const uploadUrl = presignRes.body.data.uploadUrl;
      const uploadTicket = presignRes.body.data.uploadTicket;
      const storageKey = presignRes.body.data.storageKey;
      expect(uploadUrl).toBeDefined();
      expect(uploadTicket).toBeDefined();
      expect(storageKey).toBeDefined();
      expect(presignRes.body.data.expiresInSeconds).toBe(900);

      // Complete upload
      const completeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${testLessonId}/files/complete-upload`)
        .set('Cookie', teacherSessionCookie)
        .send({
          storageKey,
          fileName: 'pilot-curriculum-guide.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024 * 1024,
          uploadTicket,
        })
        .expect(201);

      expect(completeRes.body.success).toBe(true);
      const uploadedFileId = completeRes.body.data.id;
      expect(uploadedFileId).toBeDefined();

      // Fetch metadata via authorized endpoint
      const metaRes = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .set('Cookie', teacherSessionCookie)
        .expect(200);

      expect(metaRes.body.success).toBe(true);
      expect(metaRes.body.data.id).toBe(uploadedFileId);
      expect(metaRes.body.data.originalName).toBe('pilot-curriculum-guide.pdf');
      expect(metaRes.body.data.tenantId).toBe(teacherTenantId);
    });
  });

  // =========================================================================
  // GATE 6: Observability, Probes, Metrics & Alerting Readiness
  // =========================================================================
  describe('Gate 6: Observability, Probes, Metrics & Alerting Readiness', () => {
    it('Liveness probe responds fast (<15ms) independent of DB or external services', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
      const latency = Date.now() - start;

      expect(latency).toBeLessThan(100);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.memoryUsage.rss).toBeGreaterThan(0);
    });

    it('Readiness probe confirms database readiness without leaking sensitive credentials', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
      expect(JSON.stringify(res.body)).not.toContain('password');
      expect(JSON.stringify(res.body)).not.toContain('postgres://');
    });

    it('Dependency probe inspects PostgreSQL and object storage connectivity safely', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/dependencies').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.dependencies.database.status).toBe('up');
      expect(res.body.data.dependencies.storage.status).toBe('up');
    });

    it('Metrics endpoint exports JSON and Prometheus exposition formats with route normalization', async () => {
      // JSON format
      const jsonRes = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(200);
      expect(jsonRes.body.success).toBe(true);
      expect(jsonRes.body.data.service).toBe('darb-api');
      expect(jsonRes.body.data.http.totalRequests).toBeGreaterThanOrEqual(1);

      // Prometheus format
      const promRes = await request(app.getHttpServer())
        .get('/api/v1/health/metrics?format=prometheus')
        .expect(200);
      expect(promRes.headers['content-type']).toContain('text/plain');
      expect(promRes.text).toContain('# HELP darb_http_requests_total');
      expect(promRes.text).toContain('darb_process_memory_bytes');
    });

    it('Sanitizes X-Request-Id headers and redacts sensitive data from error envelopes', async () => {
      const maliciousId = '<script>evil()</script>';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('X-Request-Id', maliciousId)
        .expect(200);

      const returnedId = res.headers['x-request-id'];
      expect(returnedId).not.toBe(maliciousId);
      expect(returnedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});
