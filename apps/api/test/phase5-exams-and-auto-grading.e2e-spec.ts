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
import { AttemptStatus, ExamStatus } from '@darb/contracts';

describe('DARB Phase 5: Multiple-Choice Exams & Automatic Grading E2E Tests', () => {
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
  let examId: string;
  let question1Id: string;
  let q1CorrectOptId: string;
  let question2Id: string;
  let q2CorrectOptId: string;
  let q2WrongOptId: string;
  let attempt1Id: string;

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

    // Create course owned by Teacher Ahmed in Tenant 1 with Student Tariq enrolled
    const teacherAhmed = await prisma.user.findUniqueOrThrow({ where: { username: 'teacher.ahmed' } });
    const studentTariq = await prisma.user.findUniqueOrThrow({ where: { username: 'student.tariq' } });

    const course = await prisma.course.create({
      data: {
        tenantId: tenant1Id,
        teacherId: teacherAhmed.id,
        title: 'مقرر الكيمياء العامة - المرحلة الثانوية',
        description: 'مقرر الكيمياء مع اختبارات إلكترونية مؤتمتة',
        status: 'PUBLISHED',
      },
    });
    courseId = course.id;

    // Enroll Tariq
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
  // P5-001: Exam and Question Authoring
  // ---------------------------------------------------------------------------
  describe('P5-001: Exam & Question Authoring', () => {
    it('Teacher Ahmed creates draft exam with valid parameters', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${courseId}/exams`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'اختبار الكيمياء النصفي - الروابط الكيميائية <script>alert("hack")</script>',
          instructions: 'أجب عن جميع الأسئلة بدقة، مدة الاختبار 30 دقيقة.',
          durationMinutes: 30,
          maxAttempts: 2,
          passingScore: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('اختبار الكيمياء النصفي - الروابط الكيميائية'); // Sanitized!
      expect(res.body.data.status).toBe(ExamStatus.DRAFT);
      expect(res.body.data.durationMinutes).toBe(30);
      expect(res.body.data.maxAttempts).toBe(2);

      examId = res.body.data.id;
    });

    it('Rejects exam creation with invalid duration (<= 0 or > 300)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/courses/${courseId}/exams`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          title: 'اختبار غير صالح',
          durationMinutes: 0,
        });

      expect(res.status).toBe(400);
    });

    it('Teacher Ahmed adds Question 1 with 4 options and 1 correct option', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'ما نوع الرابطة في جزيء كلوريد الصوديوم (NaCl)؟',
          points: 10,
          options: [
            { content: 'رابطة تساهمية أحادية', isCorrect: false },
            { content: 'رابطة أيونية', isCorrect: true },
            { content: 'رابطة فلزية', isCorrect: false },
            { content: 'رابطة هيدروجينية', isCorrect: false },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.points).toBe(10);
      expect(res.body.data.options).toHaveLength(4);

      question1Id = res.body.data.id;
      const correctOpt = res.body.data.options.find((o: any) => o.isCorrect);
      const wrongOpt = res.body.data.options.find((o: any) => !o.isCorrect);
      expect(correctOpt).toBeDefined();
      q1CorrectOptId = correctOpt.id;
      q1WrongOptId = wrongOpt.id;
    });

    it('Rejects adding a question with no correct answer or multiple correct answers', async () => {
      // No correct answer
      const resNoCorrect = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'سؤال بدون إجابة صحيحة',
          points: 5,
          options: [
            { content: 'خيار أ', isCorrect: false },
            { content: 'خيار ب', isCorrect: false },
          ],
        });
      expect(resNoCorrect.status).toBe(400);

      // Multiple correct answers
      const resMultiCorrect = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'سؤال بإجابتين صحيحتين',
          points: 5,
          options: [
            { content: 'خيار أ', isCorrect: true },
            { content: 'خيار ب', isCorrect: true },
          ],
        });
      expect(resMultiCorrect.status).toBe(400);
    });

    it('Teacher Ahmed adds Question 2 with 3 options', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/questions`)
        .set('Cookie', teacherAhmedCookie)
        .send({
          prompt: 'ما هو العدد الذري لعنصر الكربون؟',
          points: 10,
          options: [
            { content: '6', isCorrect: true },
            { content: '12', isCorrect: false },
            { content: '14', isCorrect: false },
          ],
        });

      expect(res.status).toBe(201);
      question2Id = res.body.data.id;
      const correctOpt = res.body.data.options.find((o: any) => o.isCorrect);
      const wrongOpt = res.body.data.options.find((o: any) => !o.isCorrect);
      q2CorrectOptId = correctOpt.id;
      q2WrongOptId = wrongOpt.id;
    });

    it('Tenant Isolation: Teacher Layla (Tenant 2) cannot list or modify Teacher Ahmed exams', async () => {
      // Cannot list
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/teacher/courses/${courseId}/exams`)
        .set('Cookie', teacherLaylaCookie);
      expect([403, 404]).toContain(listRes.status);

      // Cannot update
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/teacher/exams/${examId}`)
        .set('Cookie', teacherLaylaCookie)
        .send({ title: 'محاولة اختراق' });
      expect([403, 404]).toContain(updateRes.status);

      // Cannot publish
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/publish`)
        .set('Cookie', teacherLaylaCookie);
      expect([403, 404]).toContain(pubRes.status);
    });

    it('Teacher Ahmed publishes the exam successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/publish`)
        .set('Cookie', teacherAhmedCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ExamStatus.PUBLISHED);
    });
  });

  // ---------------------------------------------------------------------------
  // P5-002: Server-Enforced Exam Timer & Attempt Management
  // ---------------------------------------------------------------------------
  describe('P5-002: Server-Enforced Exam Timer & Attempt Management', () => {
    it('Unenrolled Student Sara is denied access to exam', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${courseId}/exams`)
        .set('Cookie', studentSaraCookie);

      expect(res.status).toBe(403);
    });

    it('Student Tariq lists published exams and views details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/courses/${courseId}/exams`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((e: any) => e.id === examId);
      expect(found).toBeDefined();
      expect(found.totalPoints).toBe(20);
      expect(found.questionsCount).toBe(2);
      expect(found.remainingAttempts).toBe(2);
    });

    it('Student Tariq starts Attempt 1 with server-enforced deadlineAt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/exams/${examId}/start`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.attemptId).toBeDefined();
      expect(res.body.data.attemptNumber).toBe(1);
      expect(res.body.data.durationMinutes).toBe(30);
      expect(res.body.data.deadlineAt).toBeDefined();

      attempt1Id = res.body.data.attemptId;
    });

    it('Security Check: isCorrect property is stripped from questions payload for student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${attempt1Id}/questions`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(2);

      // Verify each option in each question does NOT have isCorrect
      for (const q of res.body.data.questions) {
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }
    });

    it('Student Sara cannot access or submit Tariq active attempt (Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${attempt1Id}/questions`)
        .set('Cookie', studentSaraCookie);

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // P5-003: Real-Time Saving, Auto-Grading & Atomic GradeRecord
  // ---------------------------------------------------------------------------
  describe('P5-003: Real-Time Answer Saving & Automatic Grading', () => {
    it('Student Tariq saves answers incrementally in real-time', async () => {
      // Question 1 -> correct answer
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt1Id}/answers`)
        .set('Cookie', studentTariqCookie)
        .send({
          questionId: question1Id,
          selectedOptionId: q1CorrectOptId,
        });
      expect(res1.status).toBe(200);
      expect(res1.body.data.selectedOptionId).toBe(q1CorrectOptId);

      // Question 2 -> wrong answer
      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt1Id}/answers`)
        .set('Cookie', studentTariqCookie)
        .send({
          questionId: question2Id,
          selectedOptionId: q2WrongOptId,
        });
      expect(res2.status).toBe(200);
      expect(res2.body.data.selectedOptionId).toBe(q2WrongOptId);
    });

    it('Student Tariq submits attempt: auto-graded accurately (10/20, 50%, isPassed: true)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt1Id}/submit`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(10);
      expect(res.body.data.totalPoints).toBe(20);
      expect(res.body.data.percentage).toBe(50);
      expect(res.body.data.isPassed).toBe(true);
      expect(res.body.data.status).toBe(AttemptStatus.GRADED);

      // Verify atomic GradeRecord synchronization
      const grade = await prisma.gradeRecord.findFirst({
        where: {
          courseId,
          itemId: examId,
          itemType: 'EXAM',
        },
      });
      expect(grade).toBeDefined();
      expect(grade?.score).toBe(10);
      expect(grade?.maxScore).toBe(20);
    });

    it('Student Tariq reviews completed attempt with correct options revealed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student/exam-attempts/${attempt1Id}/review`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(2);

      const q1Review = res.body.data.questions.find((q: any) => q.questionId === question1Id);
      expect(q1Review.isCorrect).toBe(true);
      expect(q1Review.awardedPoints).toBe(10);

      const q2Review = res.body.data.questions.find((q: any) => q.questionId === question2Id);
      expect(q2Review.isCorrect).toBe(false);
      expect(q2Review.awardedPoints).toBe(0);
      expect(q2Review.correctOptionId).toBe(q2CorrectOptId);
    });

    it('Attempt Locking: Student cannot modify answers or re-submit finished attempt', async () => {
      const resAns = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt1Id}/answers`)
        .set('Cookie', studentTariqCookie)
        .send({
          questionId: question2Id,
          selectedOptionId: q2CorrectOptId,
        });
      expect(resAns.status).toBe(400);

      const resSub = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt1Id}/submit`)
        .set('Cookie', studentTariqCookie);
      expect(resSub.status).toBe(400);
    });

    it('Multiple Attempts: Student starts Attempt 2 and gets 20/20, GradeRecord updates to highest score', async () => {
      // 1. Start Attempt 2
      const startRes = await request(app.getHttpServer())
        .post(`/api/v1/student/exams/${examId}/start`)
        .set('Cookie', studentTariqCookie);

      expect(startRes.status).toBe(200);
      const attempt2Id = startRes.body.data.attemptId;
      expect(startRes.body.data.attemptNumber).toBe(2);

      // 2. Answer both Q1 & Q2 correctly
      await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt2Id}/answers`)
        .set('Cookie', studentTariqCookie)
        .send({ questionId: question1Id, selectedOptionId: q1CorrectOptId });

      await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt2Id}/answers`)
        .set('Cookie', studentTariqCookie)
        .send({ questionId: question2Id, selectedOptionId: q2CorrectOptId });

      // 3. Submit Attempt 2
      const subRes = await request(app.getHttpServer())
        .post(`/api/v1/student/exam-attempts/${attempt2Id}/submit`)
        .set('Cookie', studentTariqCookie);

      expect(subRes.status).toBe(200);
      expect(subRes.body.data.score).toBe(20);
      expect(subRes.body.data.percentage).toBe(100);

      // 4. Verify GradeRecord holds highest score (20) without duplicate rows
      const grades = await prisma.gradeRecord.findMany({
        where: {
          courseId,
          itemId: examId,
          itemType: 'EXAM',
        },
      });
      expect(grades).toHaveLength(1);
      expect(grades[0].score).toBe(20);
    });

    it('Max Attempts Enforcement: Student cannot start Attempt 3 when maxAttempts is 2', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student/exams/${examId}/start`)
        .set('Cookie', studentTariqCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('استنفدت');
    });

    it('Teacher Ahmed views exam submissions list with all attempts and scores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/exams/${examId}/submissions`)
        .set('Cookie', teacherAhmedCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // Attempt 1 and Attempt 2
      expect(res.body.data[0].studentUsername).toBe('student.tariq');
    });

    it('Teacher Ahmed closes exam: status becomes CLOSED and student cannot attempt', async () => {
      const closeRes = await request(app.getHttpServer())
        .post(`/api/v1/teacher/exams/${examId}/close`)
        .set('Cookie', teacherAhmedCookie);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe(ExamStatus.CLOSED);

      // Student cannot start closed exam
      const attemptRes = await request(app.getHttpServer())
        .post(`/api/v1/student/exams/${examId}/start`)
        .set('Cookie', studentTariqCookie);
      expect([400, 403]).toContain(attemptRes.status);
    });
  });
});
