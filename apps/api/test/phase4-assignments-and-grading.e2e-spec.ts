import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AssignmentStatus, SubmissionStatus } from '@darb/contracts';

describe('DARB Phase 4: Assignments & Manual Grading E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Session cookies
  let teacherAhmedCookie: string[];
  let teacherLaylaCookie: string[];
  let studentTariqCookie: string[];
  let studentSaraCookie: string[];

  // Test entities
  let tenant1Id: string;
  let courseId: string;
  let assignment1Id: string;
  let assignmentLateId: string;
  let submission1Id: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public',
        },
      },
    });
    await prisma.$connect();

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

    // Helper to login
    const login = async (username: string, password = 'Darap123456!') => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password });
      expect(res.status).toBe(200);
      return res.headers['set-cookie'];
    };

    // Authenticate users
    teacherAhmedCookie = await login('teacher.ahmed');
    teacherLaylaCookie = await login('teacher.layla');
    studentTariqCookie = await login('student.tariq');
    studentSaraCookie = await login('student.sara');

    // Setup an active course owned by Teacher Ahmed in Tenant 1 with Student Tariq enrolled
    const teacherAhmed = await prisma.user.findUniqueOrThrow({
      where: { username: 'teacher.ahmed' },
    });
    const studentTariq = await prisma.user.findUniqueOrThrow({
      where: { username: 'student.tariq' },
    });

    const course = await prisma.course.create({
      data: {
        tenantId: tenant1Id,
        teacherId: teacherAhmed.id,
        title: 'رياضيات متقدمة - المرحلة الثانوية',
        description: 'مقرر الرياضيات للصف الثاني الثانوي مع واجبات دورية',
        status: 'PUBLISHED',
      },
    });
    courseId = course.id;

    // Enroll Student Tariq in the course
    await prisma.enrollment.create({
      data: {
        tenantId: tenant1Id,
        courseId: course.id,
        studentId: studentTariq.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // P4-001: Assignment Creation, Management, and Teacher Isolation
  // ---------------------------------------------------------------------------
  describe('P4-001: Assignment Creation and Publishing', () => {
    it('Teacher Ahmed creates draft assignment with valid title, description, maxScore and dueDate', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${courseId}/assignments`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'واجب التفاضل والتكامل الأول <script>alert("xss")</script>',
          description: 'حل المسائل من 1 إلى 5 في الكتاب المدرسي ص 45',
          maxScore: 100,
          dueDate: futureDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('واجب التفاضل والتكامل الأول'); // Sanitized!
      expect(res.body.data.status).toBe(AssignmentStatus.DRAFT);
      expect(res.body.data.maxScore).toBe(100);

      assignment1Id = res.body.data.id;
    });

    it('Rejects assignment creation with invalid maxScore (<= 0 or non-numeric)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${courseId}/assignments`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'واجب غير صالح',
          maxScore: -10,
        });

      expect(res.status).toBe(400);
    });

    it('Teacher Ahmed can update draft assignment (title, maxScore to 50)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/assignments/${assignment1Id}`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'واجب التفاضل والتكامل المعدل',
          maxScore: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('واجب التفاضل والتكامل المعدل');
      expect(res.body.data.maxScore).toBe(50);
    });

    it('Tenant Isolation: Teacher Layla (Tenant 2) cannot list or modify Teacher Ahmed assignments', async () => {
      // 1. Cannot list
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${courseId}/assignments`)
        .set('Cookie', teacherLaylaCookie);
      expect([403, 404]).toContain(listRes.status);

      // 2. Cannot update
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/assignments/${assignment1Id}`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'محاولة اختراق' });
      expect([403, 404]).toContain(updateRes.status);

      // 3. Cannot publish
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/assignments/${assignment1Id}/publish`)
        .set('Cookie', teacherLaylaCookie);
      expect([403, 404]).toContain(pubRes.status);
    });

    it('Teacher Ahmed publishes the assignment successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/assignments/${assignment1Id}/publish`)
        .set('Cookie', teacherAhmedCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AssignmentStatus.PUBLISHED);
    });

    it('Teacher Ahmed creates a second assignment with past dueDate to test LATE submission', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${courseId}/assignments`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'واجب متأخر للاختبار',
          maxScore: 20,
          dueDate: pastDate,
        });
      expect(createRes.status).toBe(201);
      assignmentLateId = createRes.body.data.id;

      // Publish it
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/assignments/${assignmentLateId}/publish`)
        .set('Cookie', teacherAhmedCookie);
    });
  });

  // ---------------------------------------------------------------------------
  // P4-002: Student Submissions, Attachments, and Constraints
  // ---------------------------------------------------------------------------
  describe('P4-002: Student Submissions & Attachment Handling', () => {
    it('Student Tariq lists published assignments for the course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${courseId}/assignments`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((a: any) => a.id === assignment1Id);
      expect(found).toBeDefined();
      expect(found.title).toBe('واجب التفاضل والتكامل المعدل');
      expect(found.mySubmission).toBeNull();
    });

    it('Student Sara (not enrolled in the course) is denied access', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${courseId}/assignments`)
        .set('Cookie', studentSaraCookie);

      expect(res.status).toBe(403);
    });

    it('Student Tariq uploads an attachment file for the submission', async () => {
      // 1. Presign upload
      const presignRes = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignment1Id}/files/presign-upload`)
        .set('Cookie', studentTariqCookie)
        .send({
          fileName: 'حل_التفاضل.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
        });

      expect(presignRes.status).toBe(200);
      const { uploadUrl, storageKey, uploadTicket } = presignRes.body.data;
      expect(uploadUrl).toBeDefined();
      expect(storageKey).toContain(assignment1Id);

      // In local dev storage provider, simulate write to file system
      const localFilePath = path.join(process.cwd(), 'uploads', storageKey);
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
      fs.writeFileSync(localFilePath, 'Mock PDF File Content');

      // 2. Complete upload
      const completeRes = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignment1Id}/files/complete-upload`)
        .set('Cookie', studentTariqCookie)
        .send({
          storageKey,
          fileName: 'حل_التفاضل.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          uploadTicket,
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.id).toBeDefined();
      uploadedFileId = completeRes.body.data.id;
    });

    it('Student Tariq submits assignment solution with text and verified file attachment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignment1Id}/submit`)
        .set('Cookie', studentTariqCookie)
        .send({
          textContent: 'هذا نص إجابتي الكاملة على مسائل التفاضل ص 45 مع الخطوات',
          fileIds: [uploadedFileId],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe(SubmissionStatus.SUBMITTED);
      expect(res.body.data.isLate).toBe(false);
      expect(res.body.data.score).toBeNull(); // Masked before grading
      expect(res.body.data.attachments).toHaveLength(1);

      submission1Id = res.body.data.id;
    });

    it('Student Tariq cannot submit again (unique constraint on assignmentId, studentId)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignment1Id}/submit`)
        .set('Cookie', studentTariqCookie)
        .send({
          textContent: 'محاولة إعادة تسليم ثانية لنفس الواجب',
        });

      expect(res.status).toBe(400);
    });

    it('Student Tariq submits overdue assignment -> status automatically marked LATE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/assignments/${assignmentLateId}/submit`)
        .set('Cookie', studentTariqCookie)
        .send({
          textContent: 'تسليم حل الواجب بعد انتهاء الموعد المحدد',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubmissionStatus.LATE);
      expect(res.body.data.isLate).toBe(true);
    });

    it('Grade Release Policy: Student cannot see score or feedback until teacher grades', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/assignments/${assignment1Id}`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.mySubmission).toBeDefined();
      expect(res.body.data.mySubmission.score).toBeNull();
      expect(res.body.data.mySubmission.feedback).toBeNull();
      expect(res.body.data.mySubmission.status).toBe(SubmissionStatus.SUBMITTED);
    });
  });

  // ---------------------------------------------------------------------------
  // P4-003: Teacher Grading, Atomic GradeRecord, and Security
  // ---------------------------------------------------------------------------
  describe('P4-003: Teacher Grading and Feedback', () => {
    it('Teacher Ahmed views assignment details and student submissions list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment1Id}`)
        .set('Cookie', teacherAhmedCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions).toHaveLength(1);
      const sub = res.body.data.submissions[0];
      expect(sub.studentUsername).toBe('student.tariq');
      expect(sub.attachments).toHaveLength(1);
      expect(sub.status).toBe(SubmissionStatus.SUBMITTED);
    });

    it('Rejects grading with score > maxScore or negative score', async () => {
      // Score > 50 (maxScore is 50)
      const resOver = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submission1Id}/grade`)
        .set('Cookie', teacherAhmedCookie)
        .send({ score: 75 });
      expect(resOver.status).toBe(400);

      // Score < 0
      const resNeg = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submission1Id}/grade`)
        .set('Cookie', teacherAhmedCookie)
        .send({ score: -5 });
      expect(resNeg.status).toBe(400);
    });

    it('Teacher Ahmed grades Tariq submission with score 45/50 and written feedback', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submission1Id}/grade`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          score: 45,
          feedback: 'أحسنت في الحل الرياضي، راجع خطوة التفاضل الجزئي في المسألة الثالثة',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(45);
      expect(res.body.data.status).toBe(SubmissionStatus.GRADED);
      expect(res.body.data.graderName).toBeDefined();

      // Verify atomic GradeRecord in database
      const gradeRecord = await prisma.gradeRecord.findFirst({
        where: {
          courseId,
          itemId: assignment1Id,
          itemType: 'ASSIGNMENT',
        },
      });
      expect(gradeRecord).toBeDefined();
      expect(gradeRecord?.score).toBe(45);
      expect(gradeRecord?.maxScore).toBe(50);
    });

    it('Teacher updates grade to 48/50: GradeRecord is updated atomically without duplicate row errors', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submission1Id}/grade`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          score: 48,
          feedback: 'تم تعديل الدرجة بعد مراجعة الخطوة الإضافية',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(48);

      const records = await prisma.gradeRecord.findMany({
        where: {
          courseId,
          itemId: assignment1Id,
          itemType: 'ASSIGNMENT',
        },
      });
      expect(records).toHaveLength(1); // Upserted cleanly!
      expect(records[0].score).toBe(48);
    });

    it('Grade Release Policy: Student Tariq can now view score and teacher feedback', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/assignments/${assignment1Id}`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.mySubmission.score).toBe(48);
      expect(res.body.data.mySubmission.feedback).toContain('تم تعديل الدرجة');
      expect(res.body.data.mySubmission.status).toBe(SubmissionStatus.GRADED);
    });

    it('Unauthorized Teacher Layla cannot grade submission', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/submissions/${submission1Id}/grade`)
        .set('Cookie', teacherLaylaCookie)
        .send({ score: 50 });

      expect([403, 404]).toContain(res.status);
    });

    it('Student Tariq can download his submission attachment via presigned URL', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/submission-attachments/${uploadedFileId}/presign-download`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.fileName).toBe('حل_التفاضل.pdf');
    });

    it('Student Sara cannot download Student Tariq submission attachment (Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/submission-attachments/${uploadedFileId}/presign-download`)
        .set('Cookie', studentSaraCookie);

      expect(res.status).toBe(403);
    });

    it('Teacher Ahmed can close the assignment and students cannot submit to closed assignment', async () => {
      // 1. Close assignment
      const closeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/assignments/${assignment1Id}/close`)
        .set('Cookie', teacherAhmedCookie);
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe(AssignmentStatus.CLOSED);

      // 2. Cannot update closed assignment
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/assignments/${assignment1Id}`)
        .set('Cookie', teacherAhmedCookie)
        .send({ title: 'محاولة تعديل تكليف مغلق' });
      expect(patchRes.status).toBe(400);
    });
  });
});
