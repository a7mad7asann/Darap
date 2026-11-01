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
import { AssignmentStatus, AttemptStatus, CourseStatus } from '@darb/contracts';

describe('DARB Phase 6: P6-002 Pilot Workflow Acceptance Suite', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Tenants
  let tenant1Id: string; // al-andalus (Teacher Ahmed)
  let tenant2Id: string; // al-noor (Teacher Layla)

  // Teachers
  let teacherAhmedCookie: string[];
  let teacherLaylaCookie: string[];

  // Admin
  let adminCookie: string[];

  // 5 Pilot Students
  let studentTariqCookie: string[]; // Seeded in Tenant 1
  let studentSaraCookie: string[]; // Seeded in Tenant 2
  let studentOmarCookie: string[]; // Provisioned in Tenant 1
  let studentMonaCookie: string[]; // Provisioned in Tenant 2
  let studentZainCookie: string[]; // Provisioned in Tenant 1

  // Ahmed's Pilot Course Artifacts
  let ahmedCourseId: string;
  let ahmedSection1Id: string;
  let ahmedSection2Id: string;
  let ahmedLesson1Id: string;
  let ahmedLesson2Id: string;
  let ahmedDraftLesson3Id: string;
  let rawJoinCodeA: string;
  let rawRevokedCodeB: string;
  let revokedCodeBId: string;

  // Layla's Pilot Course Artifacts
  let laylaCourseId: string;
  let rawJoinCodeC: string;

  // Assignment Artifacts
  let assignmentId: string;
  let submissionId: string;

  // Exam Artifacts
  let examId: string;
  let question1Id: string;
  let q1CorrectOptId: string;
  let question2Id: string;
  let q2CorrectOptId: string;
  let q2WrongOptId: string;
  let saraAttemptId: string;

  const pilotUsernames = ['student.pilot_omar', 'student.pilot_mona', 'student.pilot_zain'];

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public',
        },
      },
    });
    await prisma.$connect();

    // Clean up any test users from previous runs
    await prisma.auditLog.deleteMany({
      where: { actor: { username: { in: pilotUsernames } } },
    });
    await prisma.gradeRecord.deleteMany({
      where: { student: { username: { in: pilotUsernames } } },
    });
    await prisma.attemptAnswer.deleteMany({
      where: { attempt: { student: { username: { in: pilotUsernames } } } },
    });
    await prisma.examAttempt.deleteMany({
      where: { student: { username: { in: pilotUsernames } } },
    });
    await prisma.assignmentSubmission.deleteMany({
      where: { student: { username: { in: pilotUsernames } } },
    });
    await prisma.lessonProgress.deleteMany({
      where: { student: { username: { in: pilotUsernames } } },
    });
    await prisma.enrollment.deleteMany({
      where: { student: { username: { in: pilotUsernames } } },
    });
    await prisma.membership.deleteMany({
      where: { user: { username: { in: pilotUsernames } } },
    });
    await prisma.studentProfile.deleteMany({
      where: { user: { username: { in: pilotUsernames } } },
    });
    await prisma.user.deleteMany({
      where: { username: { in: pilotUsernames } },
    });

    const alAndalus = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'al-andalus' },
    });
    tenant1Id = alAndalus.id;

    const alNoor = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'al-noor' },
    });
    tenant2Id = alNoor.id;

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

    // Login helper
    const login = async (username: string, password = 'Darap123456!') => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password });
      expect(res.status).toBe(200);
      return res.headers['set-cookie'];
    };

    // Authenticate 2 Teachers, 2 Seeded Students, 1 Admin
    teacherAhmedCookie = await login('teacher.ahmed');
    teacherLaylaCookie = await login('teacher.layla');
    studentTariqCookie = await login('student.tariq');
    studentSaraCookie = await login('student.sara');
    adminCookie = await login('admin.darb');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  // ===========================================================================
  // WORKFLOW 1: Authentication, Session Persistence & Lifecycle
  // ===========================================================================
  describe('Workflow 1: Authentication, Session Persistence & Lifecycle', () => {
    it('Admin provisions 3 additional students without personal email addresses', async () => {
      // Student Omar in Tenant 1 (al-andalus)
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.pilot_omar',
          password: 'Darap123456!',
          displayName: 'عمر ياسر',
          tenantId: tenant1Id,
          gradeLevel: 'الصف الثالث الثانوي',
        })
        .expect(201);
      expect(res1.body.data.username).toBe('student.pilot_omar');
      const dbOmar = await prisma.user.findUnique({ where: { username: 'student.pilot_omar' } });
      expect(dbOmar?.email).toBeNull();

      // Student Mona in Tenant 2 (al-noor)
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.pilot_mona',
          password: 'Darap123456!',
          displayName: 'منى أحمد',
          tenantId: tenant2Id,
          gradeLevel: 'الصف الأول الثانوي',
        })
        .expect(201);
      expect(res2.body.data.username).toBe('student.pilot_mona');
      const dbMona = await prisma.user.findUnique({ where: { username: 'student.pilot_mona' } });
      expect(dbMona?.email).toBeNull();

      // Student Zain in Tenant 1 (al-andalus)
      const res3 = await request(app.getHttpServer())
        .post('/api/v1/admin/students')
        .set('Cookie', adminCookie)
        .send({
          username: 'student.pilot_zain',
          password: 'Darap123456!',
          displayName: 'زين خالد',
          tenantId: tenant1Id,
          gradeLevel: 'الصف الثالث الثانوي',
        })
        .expect(201);
      expect(res3.body.data.username).toBe('student.pilot_zain');
      const dbZain = await prisma.user.findUnique({ where: { username: 'student.pilot_zain' } });
      expect(dbZain?.email).toBeNull();
    });

    it('All provisioned students authenticate successfully using username only', async () => {
      const login = async (username: string) => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username, password: 'Darap123456!' })
          .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.username).toBe(username);
        expect(res.headers['set-cookie']).toBeDefined();
        return res.headers['set-cookie'];
      };

      studentOmarCookie = await login('student.pilot_omar');
      studentMonaCookie = await login('student.pilot_mona');
      studentZainCookie = await login('student.pilot_zain');
    });

    it('Session persistence: authenticated user profile can be retrieved across requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('teacher.ahmed');
      expect(res.body.data.activeTenant).toBeDefined();
      expect(res.body.data.activeTenant.tenantSlug).toBe('al-andalus');
    });

    it('Session invalidation: unauthenticated request or tampered session cookie is rejected with 401', async () => {
      // Unauthenticated
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

      // Tampered cookie
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', ['darb_session=tampered.fake.jwt-signature; Path=/; HttpOnly'])
        .expect(401);
    });

    it('Logout clears session cookie and records audit log event', async () => {
      // Create a temporary session to test logout
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student.pilot_zain', password: 'Darap123456!' })
        .expect(200);

      const tempCookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', tempCookie)
        .expect(200);

      expect(logoutRes.body.success).toBe(true);

      // Verify cookie clear header
      const clearedCookies = logoutRes.headers['set-cookie'];
      expect(clearedCookies.some((c: string) => c.includes('darb_session=;'))).toBe(true);

      // Subsequent request using cleared session must be rejected with 401
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', ['darb_session=; Path=/'])
        .expect(401);
    });
  });

  // ===========================================================================
  // WORKFLOW 2: Teacher and Course Setup (2 Teachers, Multi-Tenant)
  // ===========================================================================
  describe('Workflow 2: Teacher and Course Setup', () => {
    it('Teacher Ahmed creates a new course in draft status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/teacher/courses')
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'فيزياء النواة والطاقة الحديثة',
          description: 'مقرر علمي يغطي فيزياء الإشعاع والطاقة',
          subject: 'فيزياء',
          gradeLevel: 'الصف الثالث الثانوي',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('فيزياء النواة والطاقة الحديثة');
      expect(res.body.data.status).toBe(CourseStatus.DRAFT);
      ahmedCourseId = res.body.data.id;
    });

    it('Teacher Ahmed updates course details and metadata', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'فيزياء النواة والطاقة الحديثة (المسار العلمي)',
          subject: 'الفيزياء النووية',
        })
        .expect(200);

      expect(res.body.data.title).toBe('فيزياء النواة والطاقة الحديثة (المسار العلمي)');
      expect(res.body.data.subject).toBe('الفيزياء النووية');
    });

    it('Teacher Ahmed organizes curriculum into units (Sections)', async () => {
      // Section 1
      const s1Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/sections`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الوحدة 1: النشاط الإشعاعي والانحلال',
          description: 'مفاهيم الانحلال الإشعاعي وأشعة ألفا وبيتا وجاما',
        })
        .expect(201);
      expect(s1Res.body.data.orderIndex).toBe(0);
      ahmedSection1Id = s1Res.body.data.id;

      // Section 2
      const s2Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/sections`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الوحدة 2: الانشطار والاندماج النووي',
          description: 'تفاعلات الانشطار والمفاعلات النووية',
        })
        .expect(201);
      expect(s2Res.body.data.orderIndex).toBe(1);
      ahmedSection2Id = s2Res.body.data.id;
    });

    it('Teacher Ahmed adds lessons to sections, reorders, and publishes lessons', async () => {
      // Lesson 1 in Section 1
      const l1Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'مقدمة في النشاط الإشعاعي',
          content: '## الدرس الأول\nشرح مبسط للأنوية المستقرة وغير المستقرة.',
          sectionId: ahmedSection1Id,
        })
        .expect(201);
      ahmedLesson1Id = l1Res.body.data.id;

      // Lesson 2 in Section 1
      const l2Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'عمر النصف وحسابات الانحلال',
          content: '## الدرس الثاني\nقانون الانحلال الإشعاعي وحساب عمر النصف.',
          sectionId: ahmedSection1Id,
        })
        .expect(201);
      ahmedLesson2Id = l2Res.body.data.id;

      // Lesson 3 in Section 2 (Remains DRAFT / Unpublished)
      const l3Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'المفاعلات النووية وتوليد الطاقة (مسودة خاصة)',
          content: 'محتوى لم يكتمل بعد.',
          sectionId: ahmedSection2Id,
        })
        .expect(201);
      ahmedDraftLesson3Id = l3Res.body.data.id;

      // Reorder Lessons 1 and 2
      const reorderRes = await request(app.getHttpServer())
        .put(`/api/v1/teacher/courses/${ahmedCourseId}/lessons/reorder`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          lessonIds: [ahmedLesson1Id, ahmedLesson2Id, ahmedDraftLesson3Id],
        })
        .expect(200);
      expect(reorderRes.body.success).toBe(true);

      // Publish Lesson 1 and Lesson 2
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLesson1Id}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${ahmedLesson2Id}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);
    });

    it('Teacher Ahmed publishes the course making it available for enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.data.status).toBe(CourseStatus.PUBLISHED);
    });

    it('Teacher Ahmed generates Join Code A (maxUses=3) and revocable Join Code B', async () => {
      // Code A
      const codeARes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ maxUses: 3, expiresInDays: 30 })
        .expect(201);

      expect(codeARes.body.data.rawCode).toBeDefined();
      rawJoinCodeA = codeARes.body.data.rawCode;

      // Code B
      const codeBRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ maxUses: 5, expiresInDays: 7 })
        .expect(201);

      rawRevokedCodeB = codeBRes.body.data.rawCode;
      revokedCodeBId = codeBRes.body.data.id;

      // Revoke Code B immediately
      const revokeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/join-codes/${revokedCodeBId}/revoke`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(revokeRes.body.data.status).toBe('REVOKED');
    });

    it('Teacher Layla creates Course 2 in Tenant 2 (Al-Noor) and generates Join Code C', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/teacher/courses')
        .set('Cookie', teacherLaylaCookie)
        .send({
          title: 'الكيمياء الحيوية والبروتينات',
          description: 'مقرر علمي يغطي تركيب الأحماض الأمينية والبروتينات',
          subject: 'الكيمياء الحيوية',
          gradeLevel: 'الصف الأول الثانوي',
        })
        .expect(201);

      laylaCourseId = res.body.data.id;

      // Publish Layla's course
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${laylaCourseId}/publish`)
        .set('Cookie', teacherLaylaCookie)
        .expect(200);

      // Generate Join Code C
      const codeCRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${laylaCourseId}/join-codes`)
        .set('Cookie', teacherLaylaCookie)
        .send({ maxUses: 10, expiresInDays: 30 })
        .expect(201);

      rawJoinCodeC = codeCRes.body.data.rawCode;
    });
  });

  // ===========================================================================
  // WORKFLOW 3: Student Enrollment & Learning Journey (5 Students across 2 Tenants)
  // ===========================================================================
  describe('Workflow 3: Student Enrollment & Learning Journey', () => {
    it('Rejects invalid, malformed, and revoked join codes', async () => {
      // Invalid format
      await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: 'INVALID-CODE-XYZ' })
        .expect(400);

      // Revoked code
      const resRevoked = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: rawRevokedCodeB })
        .expect(400);

      expect(resRevoked.body.message).toContain('رمز الانضمام غير صالح أو منتهي الصلاحية');
    });

    it('Student 1 (Tariq) and Student 2 (Sara, cross-tenant) join Ahmed course using Code A', async () => {
      // Tariq joins
      const resTariq = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: rawJoinCodeA })
        .expect(200);

      expect(resTariq.body.data.courseId).toBe(ahmedCourseId);

      // Duplicate enrollment prevention
      await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: rawJoinCodeA })
        .expect(400);

      // Sara (belonging to Tenant 2) joins Ahmed's course (Cross-tenant redemption)
      const resSara = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentSaraCookie)
        .send({ code: rawJoinCodeA })
        .expect(200);

      expect(resSara.body.data.courseId).toBe(ahmedCourseId);
    });

    it('Student 3 (Omar) joins Ahmed course, exhausting Code A (maxUses=3 reached)', async () => {
      // Omar joins (3rd use)
      const resOmar = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentOmarCookie)
        .send({ code: rawJoinCodeA })
        .expect(200);

      expect(resOmar.body.data.courseId).toBe(ahmedCourseId);

      // Code A is now EXHAUSTED (maxUses=3 reached)
      // Student 4 (Mona) attempts to use Code A and is safely rejected
      const resMona = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentMonaCookie)
        .send({ code: rawJoinCodeA })
        .expect(400);

      expect(resMona.body.message).toContain('رمز الانضمام غير صالح أو منتهي الصلاحية');
    });

    it('Student 4 (Mona) and Student 5 (Zain) join Layla course using Code C', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentMonaCookie)
        .send({ code: rawJoinCodeC })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentZainCookie)
        .send({ code: rawJoinCodeC })
        .expect(200);
    });

    it('Student Tariq views enrolled courses and published curriculum', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/student/courses')
        .set('Cookie', studentTariqCookie)
        .expect(200);

      expect(res.body.data.some((c: any) => c.courseId === ahmedCourseId)).toBe(true);

      // View lessons: Only published lessons (Lesson 1 & 2) are returned; Draft Lesson 3 is omitted
      const lessonsRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      expect(lessonsRes.body.data).toHaveLength(2);
      expect(lessonsRes.body.data.some((l: any) => l.id === ahmedLesson1Id)).toBe(true);
      expect(lessonsRes.body.data.some((l: any) => l.id === ahmedLesson2Id)).toBe(true);
      expect(lessonsRes.body.data.some((l: any) => l.id === ahmedDraftLesson3Id)).toBe(false);
    });

    it('Student Tariq marks Lesson 1 as completed and retrieves progress', async () => {
      const progressRes = await request(app.getHttpServer())
        .post(`/api/v1/student/lessons/${ahmedLesson1Id}/progress`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      expect(progressRes.body.data.isCompleted).toBe(true);

      // Verify persisted in curriculum response
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      const l1 = checkRes.body.data.find((l: any) => l.id === ahmedLesson1Id);
      expect(l1.isCompleted).toBe(true);
    });

    it('Security Denial: Student Tariq cannot mark progress on draft Lesson 3', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/student/lessons/${ahmedDraftLesson3Id}/progress`)
        .set('Cookie', studentTariqCookie)
        .expect(404);
    });

    it('Security Denial: Unenrolled Student Mona cannot access Ahmed course lessons', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', studentMonaCookie)
        .expect(403);
    });
  });

  // ===========================================================================
  // WORKFLOW 4: Assignments Lifecycle, Submissions & Manual Grading
  // ===========================================================================
  describe('Workflow 4: Assignments Lifecycle & Manual Grading', () => {
    it('Teacher Ahmed creates and publishes an assignment', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/assignments`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'واجب الانحلال الإشعاعي وتطبيقاته',
          description: 'احسب عمر النصف لعينة اليورانيوم واشرح ظاهرة النشاط الإشعاعي.',
          maxScore: 50,
          dueDate: futureDate,
        })
        .expect(201);

      expect(res.body.data.status).toBe(AssignmentStatus.DRAFT);
      assignmentId = res.body.data.id;

      // Publish assignment
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/assignments/${assignmentId}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(pubRes.body.data.status).toBe(AssignmentStatus.PUBLISHED);
    });

    it('Enrolled Student Tariq views assignment and submits work', async () => {
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/assignments`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      const found = listRes.body.data.find((a: any) => a.id === assignmentId);
      expect(found).toBeDefined();
      expect(found.maxScore).toBe(50);
      expect(found.mySubmission).toBeNull();

      // Submit work
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignmentId}/submit`)
        .set('Cookie', studentTariqCookie)
        .send({
          textContent: 'تم حساب عمر النصف: النتيجة هي 4.5 مليار سنة، مع توضيح آلية انحلال بيتا.',
        })
        .expect(200);

      expect(submitRes.body.data.status).toBe('SUBMITTED');
      submissionId = submitRes.body.data.id;

      // Duplicate submission rejected
      await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignmentId}/submit`)
        .set('Cookie', studentTariqCookie)
        .send({ textContent: 'محاولة إعادة تسليم مرفوضة' })
        .expect(400);
    });

    it('Grade visibility rule: Student sees score as null until teacher grades submission', async () => {
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/assignments`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      const found = checkRes.body.data.find((a: any) => a.id === assignmentId);
      expect(found.mySubmission).toBeDefined();
      expect(found.mySubmission.status).toBe('SUBMITTED');
      expect(found.mySubmission.score).toBeNull();
      expect(found.mySubmission.feedback).toBeNull();
    });

    it('Teacher Ahmed reviews submission and grades it with score and feedback', async () => {
      const gradeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submissionId}/grade`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          score: 48,
          feedback: 'إجابة نموذجية وممتازة، تم حساب عمر النصف بدقة عالية.',
        })
        .expect(200);

      expect(gradeRes.body.data.score).toBe(48);
      expect(gradeRes.body.data.status).toBe('GRADED');
      expect(gradeRes.body.data.feedback).toContain('إجابة نموذجية');
    });

    it('Grade release: Student now sees status GRADED with score and feedback', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${ahmedCourseId}/assignments`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      const found = res.body.data.find((a: any) => a.id === assignmentId);
      expect(found.mySubmission.status).toBe('GRADED');
      expect(found.mySubmission.score).toBe(48);
      expect(found.mySubmission.feedback).toContain('إجابة نموذجية');

      // Database verification: GradeRecord exists
      const gradeRecord = await prisma.gradeRecord.findFirst({
        where: {
          courseId: ahmedCourseId,
          itemId: assignmentId,
          itemType: 'ASSIGNMENT',
        },
      });
      expect(gradeRecord).toBeDefined();
      expect(gradeRecord?.score).toBe(48);
    });

    it('Security Denial: Unenrolled Student Mona cannot submit Ahmed assignment', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignmentId}/submit`)
        .set('Cookie', studentMonaCookie)
        .send({ textContent: 'اختراق غير مصرح به' })
        .expect(403);
    });
  });

  // ===========================================================================
  // WORKFLOW 5: Timed Multiple-Choice Exams & Auto-Grading Engine
  // ===========================================================================
  describe('Workflow 5: Timed MCQ Exams & Auto-Grading Engine', () => {
    it('Teacher Ahmed creates a timed MCQ exam and adds questions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/exams`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'اختبار الفيزياء الإشعاعية الموقوت',
          instructions: 'أجب عن الأسئلة بدقة خلال الوقت المحدد. مدة الاختبار 25 دقيقة.',
          durationMinutes: 25,
          maxAttempts: 2,
          passingScore: 12,
        })
        .expect(201);

      examId = res.body.data.id;

      // Question 1: What particle is emitted in alpha decay? (10 pts)
      const q1Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'ما هو الجسيم المنبعث في انحلال ألفا؟',
          questionType: 'MULTIPLE_CHOICE',
          points: 10,
          options: [
            { content: 'نواة ذرة الهيليوم-4 (بروتونان ونيوترونان)', isCorrect: true },
            { content: 'إلكترون عالي الطاقة', isCorrect: false },
            { content: 'فوتون كهرومغناطيسي', isCorrect: false },
            { content: 'نيوترون مفرد', isCorrect: false },
          ],
        })
        .expect(201);

      question1Id = q1Res.body.data.id;
      const q1Correct = q1Res.body.data.options.find((o: any) => o.isCorrect === true);
      q1CorrectOptId = q1Correct.id;

      // Question 2: What is the nature of gamma rays? (10 pts)
      const q2Res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'ما هي طبيعة أشعة جاما المنبعثة من النواة؟',
          questionType: 'MULTIPLE_CHOICE',
          points: 10,
          options: [
            { content: 'موجات كهرومغناطيسية ذات طاقة وتردد فائقين', isCorrect: true },
            { content: 'جسيمات موجبة الشحنة وكتلة ثقيلة', isCorrect: false },
            { content: 'إلكترونات ذات سرعة منخفضة', isCorrect: false },
          ],
        })
        .expect(201);

      question2Id = q2Res.body.data.id;
      const q2Correct = q2Res.body.data.options.find((o: any) => o.isCorrect === true);
      const q2Wrong = q2Res.body.data.options.find((o: any) => o.isCorrect === false);
      q2CorrectOptId = q2Correct.id;
      q2WrongOptId = q2Wrong.id;

      // Publish the exam
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/publish`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);
    });

    it('Student Sara starts exam attempt with server-enforced deadlineAt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/exams/${examId}/start`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.attemptId).toBeDefined();
      expect(res.body.data.attemptNumber).toBe(1);
      expect(res.body.data.durationMinutes).toBe(25);
      expect(res.body.data.deadlineAt).toBeDefined();

      const deadline = new Date(res.body.data.deadlineAt).getTime();
      const expectedDeadline = Date.now() + 25 * 60 * 1000;
      expect(Math.abs(deadline - expectedDeadline)).toBeLessThan(10000); // within 10s

      saraAttemptId = res.body.data.attemptId;
    });

    it('Security Invariant: Questions payload for active student attempt completely omits isCorrect', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${saraAttemptId}/questions`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.questions).toHaveLength(2);
      for (const q of res.body.data.questions) {
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }
    });

    it('Student Sara incrementally saves answers in real time', async () => {
      // Question 1 -> Correct
      const a1Res = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${saraAttemptId}/answers`)
        .set('Cookie', studentSaraCookie)
        .send({
          questionId: question1Id,
          selectedOptionId: q1CorrectOptId,
        })
        .expect(200);
      expect(a1Res.body.data.selectedOptionId).toBe(q1CorrectOptId);

      // Question 2 -> Wrong option
      const a2Res = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${saraAttemptId}/answers`)
        .set('Cookie', studentSaraCookie)
        .send({
          questionId: question2Id,
          selectedOptionId: q2WrongOptId,
        })
        .expect(200);
      expect(a2Res.body.data.selectedOptionId).toBe(q2WrongOptId);
    });

    it('Student Sara submits attempt: auto-graded immediately (10/20 pts, 50%)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${saraAttemptId}/submit`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.score).toBe(10);
      expect(res.body.data.totalPoints).toBe(20);
      expect(res.body.data.percentage).toBe(50);
      expect(res.body.data.status).toBe(AttemptStatus.GRADED);

      // Synchronized to GradeRecord
      const grade = await prisma.gradeRecord.findFirst({
        where: {
          courseId: ahmedCourseId,
          itemId: examId,
          itemType: 'EXAM',
        },
      });
      expect(grade).toBeDefined();
      expect(grade?.score).toBe(10);
    });

    it('Attempt locking: modifying answers on completed attempt is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${saraAttemptId}/answers`)
        .set('Cookie', studentSaraCookie)
        .send({
          questionId: question2Id,
          selectedOptionId: q2CorrectOptId,
        })
        .expect(400);
    });

    it('Post-submission review reveals correct answers and question explanations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${saraAttemptId}/review`)
        .set('Cookie', studentSaraCookie)
        .expect(200);

      expect(res.body.data.score).toBe(10);
      expect(res.body.data.questions).toHaveLength(2);

      const q1 = res.body.data.questions.find((q: any) => q.questionId === question1Id);
      expect(q1.isCorrect).toBe(true);
      expect(q1.awardedPoints).toBe(10);

      const q2 = res.body.data.questions.find((q: any) => q.questionId === question2Id);
      expect(q2.isCorrect).toBe(false);
      expect(q2.awardedPoints).toBe(0);
    });

    it('Security Denial: Student Tariq cannot access or submit Sara exam attempt', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${saraAttemptId}/questions`)
        .set('Cookie', studentTariqCookie)
        .expect(403);
    });
  });

  // ===========================================================================
  // WORKFLOW 6: Course Roster & Authorization
  // ===========================================================================
  describe('Workflow 6: Course Roster & Authorization', () => {
    it('Teacher Ahmed retrieves course roster showing enrolled students (Tariq, Sara, Omar)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const usernames = res.body.data.map((st: any) => st.username);
      expect(usernames).toContain('student.tariq');
      expect(usernames).toContain('student.sara');
      expect(usernames).toContain('student.pilot_omar');

      // Verify each student record structure
      for (const st of res.body.data) {
        expect(st.studentId).toBeDefined();
        expect(st.username).toBeDefined();
        expect(st.displayName).toBeDefined();
        expect(st.enrolledAt).toBeDefined();
      }
    });

    it('Teacher Layla from Tenant 2 CANNOT access Ahmed course roster (404 under RLS)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);
    });

    it('Student Tariq CANNOT access teacher course roster (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
        .set('Cookie', studentTariqCookie)
        .expect(403);
    });

    it('Unauthenticated request to course roster is rejected (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}/students`)
        .expect(401);
    });
  });

  // ===========================================================================
  // WORKFLOW 7: Cross-Tenant Isolation & PostgreSQL RLS Enforcement
  // ===========================================================================
  describe('Workflow 7: Cross-Tenant Isolation & PostgreSQL RLS Enforcement', () => {
    it('Teacher Layla cannot access or modify Ahmed course (404 Not Found under Tenant RLS)', async () => {
      // View course
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);

      // Update course
      await request(app.getHttpServer())
        .patch(`/api/v1/teacher/courses/${ahmedCourseId}`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'محاولة تعديل غير مصرح بها من ليلى' })
        .expect(404);
    });

    it('Teacher Layla cannot add sections or lessons to Ahmed course (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/sections`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'وحدة غير مصرح بها' })
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${ahmedCourseId}/lessons`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'درس غير مصرح به' })
        .expect(404);
    });

    it('Teacher Layla cannot view or grade Ahmed assignments (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignmentId}`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submissionId}/grade`)
        .set('Cookie', teacherLaylaCookie)
        .send({ score: 0, feedback: 'محاولة تقييم غير مصرح بها' })
        .expect(404);
    });

    it('Teacher Layla cannot view or modify Ahmed exams (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/exams/${examId}`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/v1/teacher/exams/${examId}`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'تعديل اختبار غير مصرح به' })
        .expect(404);
    });

    it('Teacher Ahmed cannot access Teacher Layla course (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${laylaCourseId}`)
        .set('Cookie', teacherAhmedCookie)
        .expect(404);
    });
  });
});
