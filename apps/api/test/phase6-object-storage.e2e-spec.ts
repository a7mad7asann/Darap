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
import { CourseStatus, EnrollmentStatus } from '@darb/contracts';

describe('DARB Phase 6: P6-004 Object Storage & S3/R2 Cloud Integration E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let tenant1Id: string;

  let teacherAhmedCookie: string[];
  let teacherLaylaCookie: string[];
  let studentTariqCookie: string[];
  let studentSaraCookie: string[];

  let courseId: string;
  let lessonId: string;
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
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Authenticate personas
    const login = async (username: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: 'Darap123456!' });
      expect(res.status).toBe(200);
      return res.headers['set-cookie'];
    };

    teacherAhmedCookie = await login('teacher.ahmed');
    teacherLaylaCookie = await login('teacher.layla');
    studentTariqCookie = await login('student.tariq');
    studentSaraCookie = await login('student.sara');

    // Create a published course and lesson for Teacher Ahmed in tenant 1
    const teacherAhmedUser = await prisma.user.findUniqueOrThrow({
      where: { username: 'teacher.ahmed' },
    });

    const course = await prisma.course.create({
      data: {
        tenantId: tenant1Id,
        teacherId: teacherAhmedUser.id,
        title: 'مقرر التخزين السحابي التجريبي',
        status: CourseStatus.PUBLISHED,
      },
    });
    courseId = course.id;

    const lesson = await prisma.lesson.create({
      data: {
        tenantId: tenant1Id,
        courseId: course.id,
        title: 'درس اختبار رفع الملفات السحابية',
        content: 'محتوى الدرس التجريبي لاختبار التخزين السحابي وحماية البيانات',
        isPublished: true,
        orderIndex: 0,
      },
    });
    lessonId = lesson.id;

    // Enroll Tariq in Ahmed's course
    const studentTariqUser = await prisma.user.findUniqueOrThrow({
      where: { username: 'student.tariq' },
    });

    await prisma.enrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: studentTariqUser.id,
        },
      },
      update: { status: EnrollmentStatus.ACTIVE, deletedAt: null },
      create: {
        tenantId: tenant1Id,
        courseId: course.id,
        studentId: studentTariqUser.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    if (lessonId) {
      await prisma.lessonFile.deleteMany({ where: { lessonId } });
      await prisma.lesson.deleteMany({ where: { id: lessonId } });
    }
    if (courseId) {
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (uploadedFileId) {
      await prisma.fileObject.deleteMany({ where: { id: uploadedFileId } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('1. Lesson File Upload Lifecycle & Presigned URLs', () => {
    let storageKey: string;
    let uploadTicket: string;

    it('should generate presigned upload URL with proper namespace and expiration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${lessonId}/files/presign-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          fileName: 'ورقة_عمل_فيزياء.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048576, // ~2MB
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.uploadTicket).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(900);
      expect(res.body.data.storageKey).toMatch(
        new RegExp(`^tenants/${tenant1Id}/lessons/${lessonId}/[0-9a-f-]{36}-.*\\.pdf$`),
      );

      storageKey = res.body.data.storageKey;
      uploadTicket = res.body.data.uploadTicket;
    });

    it('should reject complete upload if object verification fails (tampered ticket)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${lessonId}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey,
          fileName: 'ورقة_عمل_فيزياء.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048576,
          uploadTicket: 'forged-invalid-ticket-999',
        })
        .expect(400);

      expect(res.body.success).toBe(false);

      // Verify no FileObject was committed to database
      const dbFile = await prisma.fileObject.findFirst({
        where: { storageKey },
      });
      expect(dbFile).toBeNull();
    });

    it('should complete upload successfully and persist storageProvider metadata in DB', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${lessonId}/files/complete-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          storageKey,
          fileName: 'ورقة_عمل_فيزياء.pdf',
          mimeType: 'application/pdf',
          byteSize: 2048576,
          uploadTicket,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.mimeType).toBe('application/pdf');
      expect(res.body.data.byteSize).toBe(2048576);

      uploadedFileId = res.body.data.id;

      // Verify database record has storageProvider populated
      const dbFile = await prisma.fileObject.findUniqueOrThrow({
        where: { id: uploadedFileId },
      });
      expect(dbFile.storageProvider).toBeDefined();
      expect(dbFile.tenantId).toBe(tenant1Id);
    });
  });

  describe('2. Authorized File Metadata & Download Verification', () => {
    it('should allow teacher who owns the tenant/course to retrieve file metadata', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(uploadedFileId);
      expect(res.body.data.tenantId).toBe(tenant1Id);
      expect(res.body.data.mimeType).toBe('application/pdf');
      expect(res.body.data.storageProvider).toBeDefined();
    });

    it('should allow enrolled student to retrieve file metadata', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(uploadedFileId);
      expect(res.body.data.tenantId).toBe(tenant1Id);
    });

    it('should generate authorized presigned download URL for enrolled student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/files/${uploadedFileId}/presign-download`)
        .set('Cookie', studentTariqCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(300);
      expect(res.body.data.mimeType).toBe('application/pdf');
    });
  });

  describe('3. Validation & Malicious Upload Protection', () => {
    it('should reject invalid or executable MIME types', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${lessonId}/files/presign-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          fileName: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          byteSize: 1024,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject files exceeding maximum permitted size (25MB)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/lessons/${lessonId}/files/presign-upload`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          fileName: 'huge_archive.pdf',
          mimeType: 'application/pdf',
          byteSize: 30 * 1024 * 1024, // 30 MB
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.message)).toMatch(/25/);
    });

    it('should reject unauthenticated access with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .expect(401);
    });

    it('should reject non-existent UUIDs with 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/files/00000000-0000-0000-0000-000000000000/metadata')
        .set('Cookie', teacherAhmedCookie)
        .expect(404);
    });
  });

  describe('4. Cross-Tenant Isolation & Authorization Denial', () => {
    it('should deny cross-tenant teacher access to file metadata (RLS 404)', async () => {
      // Layla is in tenant 2, Ahmed file is in tenant 1
      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should deny student from another school access to download URL (403 Forbidden)', async () => {
      // Sara is in tenant 2, not enrolled in Ahmed's course
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/files/${uploadedFileId}/presign-download`)
        .set('Cookie', studentSaraCookie)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should deny cross-tenant teacher from deleting another teacher file', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/teacher/lessons/${lessonId}/files/${uploadedFileId}`)
        .set('Cookie', teacherLaylaCookie)
        .expect(404);
    });
  });

  describe('5. Authorized File Deletion Lifecycle', () => {
    it('should allow owning teacher to delete lesson file', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/teacher/lessons/${lessonId}/files/${uploadedFileId}`)
        .set('Cookie', teacherAhmedCookie)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify soft delete in database
      const dbFile = await prisma.fileObject.findUniqueOrThrow({
        where: { id: uploadedFileId },
      });
      expect(dbFile.deletedAt).not.toBeNull();

      // Subsequent metadata lookup returns 404
      await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/metadata`)
        .set('Cookie', teacherAhmedCookie)
        .expect(404);
    });
  });
});
