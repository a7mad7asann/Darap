import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('DARB Phase 2: Courses, Join Codes, Learning & Admin E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Session cookies
  let teacherAhmedCookie: string[];
  let teacherLaylaCookie: string[];
  let studentTariqCookie: string[];
  let studentSaraCookie: string[];
  let adminCookie: string[];

  // Test entities
  let tenant1Id: string;
  let ahmedCourseId: string;
  let ahmedLessonId: string;
  let ahmedFileId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public',
        },
      },
    });
    await prisma.$connect();

    // Clean up test entities from previous test runs to ensure idempotency
    const testUsernames = [
      'teacher.kareem',
      'student.hassan',
      'student.huda',
      'student.concurrent1',
      'student.concurrent2',
    ];
    await prisma.auditLog.deleteMany({
      where: {
        actor: { username: { in: testUsernames } },
      },
    });
    await prisma.membership.deleteMany({
      where: { user: { username: { in: testUsernames } } },
    });
    await prisma.teacherProfile.deleteMany({
      where: { user: { username: { in: testUsernames } } },
    });
    await prisma.studentProfile.deleteMany({
      where: { user: { username: { in: testUsernames } } },
    });
    await prisma.tenant.deleteMany({
      where: { slug: 'al-tafawwoq' },
    });
    await prisma.user.deleteMany({
      where: { username: { in: testUsernames } },
    });

    const alAndalus = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'al-andalus' },
    });
    tenant1Id = alAndalus.id;

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

    // Authenticate test users to acquire session cookies
    const loginUser = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: 'Darap123456!' })
        .expect(200);
      return res.headers['set-cookie'];
    };

    teacherAhmedCookie = await loginUser('teacher.ahmed');
    teacherLaylaCookie = await loginUser('teacher.layla');
    studentTariqCookie = await loginUser('student.tariq');
    studentSaraCookie = await loginUser('student.sara');
    adminCookie = await loginUser('admin.darb');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  describe('1. Teacher Course Management & RLS Ownership', () => {
    it('Teacher Ahmed creates a new course in draft status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/teacher/courses')
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'فيزياء الكم والميكانيكا الحديثة',
          description: 'مقرر تجريبي للمرحلة الثانية',
          subject: 'فيزياء',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.title).toBe('فيزياء الكم والميكانيكا الحديثة');
      ahmedCourseId = res.body.data.id;
    });

    it('Teacher Ahmed can view and update his draft course', async () => {
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'فيزياء الكم المتقدمة (معدل)',
        })
        .expect(200);

      expect(updateRes.body.data.title).toBe('فيزياء الكم المتقدمة (معدل)');
    });

    it('Negative Test: Teacher Layla CANNOT view or edit Ahmed course (Cross-Tenant blocked)', async () => {
      // Layla attempts to view Ahmed's course
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);

      // Layla attempts to update Ahmed's course
      await request(app.getHttpServer())
        .patch(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'Malicious Update by Layla' })
        .expect(404);
    });

    it('Teacher Ahmed publishes his course', async () => {
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(pubRes.body.data.status).toBe('PUBLISHED');
      expect(pubRes.body.data.isActive).toBe(true);
    });
  });

  describe('2. Teacher Lesson Management & Reordering', () => {
    it('Teacher Ahmed creates lessons in his course', async () => {
      const l1 = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الدرس الأول: مقدمة في النسبية الخاصة',
          content: 'نص المحاضرة الأولى وشرح المفاهيم الأساسية.',
        })
        .expect(201);

      expect(l1.body.data.title).toBe('الدرس الأول: مقدمة في النسبية الخاصة');
      expect(l1.body.data.isPublished).toBe(false);
      ahmedLessonId = l1.body.data.id;

      // Create a second lesson
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الدرس الثاني: الإشعاع الكهرومغناطيسي',
          content: 'مفاهيم الفوتون وتردد بلانك.',
        })
        .expect(201);
    });

    it('Teacher Layla CANNOT add lessons to Ahmed course', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherLaylaCookie)
        .send({
          title: 'درس غير مصرح به من ليلى',
        })
        .expect(404);
    });

    it('Teacher Ahmed publishes the lesson', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLessonId}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.data.isPublished).toBe(true);
    });
  });

  describe('3. Cryptographic Join Code & Atomic Concurrency', () => {
    let rawJoinCode: string;
    let limitedJoinCode: string;

    it('Teacher Ahmed generates a secure join code with maxUses=10', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ maxUses: 10, expiresInDays: 14 })
        .expect(201);

      expect(res.body.data.rawCode).toBeDefined();
      expect(res.body.data.rawCode).toMatch(/^DARB-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(res.body.data.codeHint).toContain('DARB-****-****-');
      expect(res.body.data.status).toBe('ACTIVE');

      rawJoinCode = res.body.data.rawCode;

      // Verify Database: Raw code is NEVER stored in database plaintext
      const dbRecord = await prisma.joinCode.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbRecord?.codeHash).toBeDefined();
      expect(dbRecord?.codeHash).not.toBe(rawJoinCode);
      expect((dbRecord as any).rawCode).toBeUndefined();
    });

    it('Student Sara (different academy) redeems join code and enrolls successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentSaraCookie)
        .send({ code: rawJoinCode })
        .expect(200);

      expect(res.body.data.courseId).toBe(ahmedCourseId);
      expect(res.body.data.courseTitle).toBe('فيزياء الكم المتقدمة (معدل)');
    });

    it('Duplicate Enrollment Prevention: Sara redeeming the same code is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentSaraCookie)
        .send({ code: rawJoinCode })
        .expect(400);

      expect(res.body.message).toContain('مسجل بالفعل');
    });

    it('Invalid or Malformed Join Code is rejected with generic safe message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: 'DARB-FAKE-CODE-9999' })
        .expect(400);

      expect(res.body.message).toContain('رمز الانضمام غير صالح أو منتهي الصلاحية');
    });

    it('Revoked Join Code is rejected', async () => {
      // Generate a code to revoke
      const codeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ maxUses: 5 })
        .expect(201);

      const codeToRevokeId = codeRes.body.data.id;
      const codeToRevokeRaw = codeRes.body.data.rawCode;

      // Revoke it
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/join-codes/${codeToRevokeId}/revoke`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      // Student attempts to join with revoked code
      const tryRes = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: codeToRevokeRaw })
        .expect(400);

      expect(tryRes.body.message).toContain('رمز الانضمام غير صالح أو منتهي الصلاحية');
    });

    it('Atomic Concurrency Test: Join code with maxUses=1 cannot be over-redeemed under concurrent requests', async () => {
      // Create code with strictly maxUses: 1
      const codeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ maxUses: 1 })
        .expect(201);

      limitedJoinCode = codeRes.body.data.rawCode;

      // Create two new students via Admin
      await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.concurrent1',
          password: 'Darap123456!',
          displayName: 'طالب متزامن 1',
          tenantId: tenant1Id,
        });

      await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.concurrent2',
          password: 'Darap123456!',
          displayName: 'طالب متزامن 2',
          tenantId: tenant1Id,
        });

      // Login both
      const c1Cookie = (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'student.concurrent1', password: 'Darap123456!' })
      ).headers['set-cookie'];

      const c2Cookie = (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'student.concurrent2', password: 'Darap123456!' })
      ).headers['set-cookie'];

      // Fire concurrent join requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/student/join-courses')
          .set('Cookie', c1Cookie)
          .send({ code: limitedJoinCode }),
        request(app.getHttpServer())
          .post('/api/v1/student/join-courses')
          .set('Cookie', c2Cookie)
          .send({ code: limitedJoinCode }),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly ONE must succeed (200) and ONE must fail (400)
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Verify in DB that currentUses is strictly 1
      const dbCode = await prisma.joinCode.findUnique({
        where: { id: codeRes.body.data.id },
      });
      expect(dbCode?.currentUses).toBe(1);
      expect(dbCode?.status).toBe('EXPIRED');
    });

    describe('Enrolled Students Roster (GET /api/v1/teacher/courses/:courseId/students)', () => {
      it('Teacher Ahmed views enrolled students for his course and sees enrolled students', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
          .set('Cookie', teacherAhmedCookie)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        const sara = res.body.data.find((st: any) => st.username === 'student.sara');
        expect(sara).toBeDefined();
        expect(sara.displayName).toBe('سارة خالد');
        expect(sara.enrolledAt).toBeDefined();
      });

      it('Unauthenticated request to course students is rejected with 401', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
          .expect(401);
      });

      it('Student role requesting course students is rejected with 403', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
          .set('Cookie', studentSaraCookie)
          .expect(403);
      });

      it('Teacher Layla from different tenant cannot access Ahmed course students (404 RLS)', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
          .set('Cookie', teacherLaylaCookie)
          .expect(404);
      });

      it('Non-existent course UUID produces 404 with Arabic error message', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/teacher/courses/22222222-2222-2222-2222-222222222222/students')
          .set('Cookie', teacherAhmedCookie)
          .expect(404);

        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('المقرر الدراسي غير موجود');
      });

      it('Invalid course UUID format produces 400 Bad Request', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/teacher/courses/invalid-uuid/students')
          .set('Cookie', teacherAhmedCookie)
          .expect(400);
      });
    });
  });

  describe('4. Student Learning & Progress Tracking', () => {
    it('Student Sara views her enrolled courses and sees Ahmed course', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/student/courses')
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.some((c: any) => c.courseId === ahmedCourseId)).toBe(true);
    });

    it('Student Sara views published lessons and marks lesson progress', async () => {
      // View lessons
      const lessonsRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(lessonsRes.body.data.length).toBeGreaterThan(0);
      expect(lessonsRes.body.data[0].id).toBe(ahmedLessonId);
      expect(lessonsRes.body.data[0].isCompleted).toBe(false);

      // Mark completed
      const progressRes = await request(app.getHttpServer())
        .post(`/api/v1/student/lessons/${ahmedLessonId}/progress`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(progressRes.body.data.isCompleted).toBe(true);

      // Verify progress persisted
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(checkRes.body.data[0].isCompleted).toBe(true);
    });

    it('Negative Test: Student Tariq CANNOT access or mark progress for Ahmed new course (Not Enrolled)', async () => {
      // Tariq is not enrolled in ahmedCourseId
      await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}`)
        .set('Cookie', studentTariqCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/v1/student/lessons/${ahmedLessonId}/progress`)
        .set('Cookie', studentTariqCookie)
        .expect(403);
    });
  });

  describe('5. Private File Upload & Secure Download', () => {
    let uploadTicket: string;
    let storageKey: string;

    it('Teacher Ahmed requests presigned upload for lesson document', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLessonId}/files/presign-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          fileName: 'quantum_physics_handout.pdf',
          mimeType: 'application/pdf',
          byteSize: 1048576,
        })
        .expect(201);

      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.storageKey).toContain(ahmedLessonId);
      expect(res.body.data.uploadTicket).toBeDefined();

      storageKey = res.body.data.storageKey;
      uploadTicket = res.body.data.uploadTicket;
    });

    it('Teacher Layla CANNOT request presigned upload for Ahmed lesson', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLessonId}/files/presign-upload`)
        .set('Cookie', teacherLaylaCookie)
        .send({
          fileName: 'malicious.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
        })
        .expect(404);
    });

    it('Teacher Ahmed completes upload and attaches document', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLessonId}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey,
          fileName: 'quantum_physics_handout.pdf',
          mimeType: 'application/pdf',
          byteSize: 1048576,
          uploadTicket,
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.originalName).toBe('quantum_physics_handout.pdf');
      ahmedFileId = res.body.data.id;
    });

    it('Enrolled Student Sara can request presigned download for attached file', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/files/${ahmedFileId}/presign-download`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.downloadUrl).toContain('quantum_physics_handout.pdf');
    });

    it('Non-Enrolled Student Tariq is DENIED download for attached file', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/student/files/${ahmedFileId}/presign-download`)
        .set('Cookie', studentTariqCookie)
        .expect(403);
    });
  });

  describe('6. Admin Provisioning & Audited Password Reset', () => {
    let newTeacherUserId: string;
    let newStudentUserId: string;

    it('Admin provisions a new teacher and tenant academy workspace', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/teachers')
        .set('Cookie', adminCookie)
        .send({
          username: 'teacher.kareem',
          password: 'TeacherPass123!',
          displayName: 'أ. كريم سامي',
          schoolName: 'مدرسة التفوق الحديثة',
          slug: 'al-tafawwoq',
          specialization: 'أحياء',
        })
        .expect(201);

      expect(res.body.data.username).toBe('teacher.kareem');
      expect(res.body.data.slug).toBe('al-tafawwoq');
      newTeacherUserId = res.body.data.userId;
      expect(newTeacherUserId).toBeDefined();
    });

    it('Admin provisions a new student without personal email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.hassan',
          password: 'StudentPass123!',
          displayName: 'حسن محمود',
          tenantId: tenant1Id,
          gradeLevel: 'الصف الأول الثانوي',
        })
        .expect(201);

      expect(res.body.data.username).toBe('student.hassan');
      newStudentUserId = res.body.data.userId;
    });

    it('Admin disables and re-enables a user account', async () => {
      // Disable
      const disableRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${newStudentUserId}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: false })
        .expect(200);

      expect(disableRes.body.data.isActive).toBe(false);

      // Verify student cannot login while disabled
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student.hassan', password: 'StudentPass123!' })
        .expect(401);

      // Re-enable
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${newStudentUserId}/status`)
        .set('Cookie', adminCookie)
        .send({ isActive: true })
        .expect(200);
    });

    it('Admin performs audited password reset for student and logs operation', async () => {
      const resetRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${newStudentUserId}/reset-password`)
        .set('Cookie', adminCookie)
        .send({
          newPassword: 'NewSecretPass456!',
          reason: 'Parent requested reset via school administration',
        })
        .expect(200);

      expect(resetRes.body.data.message).toContain('تم إعادة تعيين كلمة المرور بنجاح');

      // Student can login with new password
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student.hassan', password: 'NewSecretPass456!' })
        .expect(200);

      // Verify Audit Log was recorded
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'PASSWORD_RESET',
          resourceId: newStudentUserId,
        },
      });
      expect(auditEntry).toBeDefined();
      expect((auditEntry?.details as any)?.reason).toBe(
        'Parent requested reset via school administration',
      );
    });
  });
});
