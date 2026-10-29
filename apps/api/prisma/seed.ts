import { PrismaClient, UserRole, TenantStatus, MembershipStatus, EnrollmentStatus } from '@prisma/client';
import { hash, Algorithm } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function seed() {
  console.log('--- Starting DARB Seed ---');

  // Default password for all test accounts
  const commonPasswordHash = await hashPassword('Darap123456!');

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin.darb' },
    update: {},
    create: {
      username: 'admin.darb',
      displayName: 'مدير منصة درب',
      email: 'admin@darb.local',
      passwordHash: commonPasswordHash,
      defaultRole: UserRole.ADMIN,
      isActive: true,
    },
  });

  // 2. Create Teacher 1 (Ahmed) and Tenant 1 (Al-Andalus)
  const teacher1 = await prisma.user.upsert({
    where: { username: 'teacher.ahmed' },
    update: {},
    create: {
      username: 'teacher.ahmed',
      displayName: 'أ. أحمد منصور',
      email: 'ahmed@alandalus.local',
      passwordHash: commonPasswordHash,
      defaultRole: UserRole.TEACHER,
      isActive: true,
      teacherProfile: {
        create: {
          bio: 'مدرس أول لمادة الفيزياء للثانوية العامة',
          specialization: 'الفيزياء',
        },
      },
    },
  });

  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'al-andalus' },
    update: {},
    create: {
      name: 'مدرسة الأندلس التعليمية',
      slug: 'al-andalus',
      ownerId: teacher1.id,
      status: TenantStatus.ACTIVE,
      memberships: {
        create: {
          userId: teacher1.id,
          role: UserRole.TEACHER,
          isOwner: true,
          status: MembershipStatus.ACTIVE,
        },
      },
    },
  });

  // 3. Create Teacher 2 (Layla) and Tenant 2 (Al-Noor)
  const teacher2 = await prisma.user.upsert({
    where: { username: 'teacher.layla' },
    update: {},
    create: {
      username: 'teacher.layla',
      displayName: 'أ. ليلى محمود',
      email: 'layla@alnoor.local',
      passwordHash: commonPasswordHash,
      defaultRole: UserRole.TEACHER,
      isActive: true,
      teacherProfile: {
        create: {
          bio: 'معلمة مادة الكيمياء والعلوم التطبيقية',
          specialization: 'الكيمياء',
        },
      },
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'al-noor' },
    update: {},
    create: {
      name: 'أكاديمية النور',
      slug: 'al-noor',
      ownerId: teacher2.id,
      status: TenantStatus.ACTIVE,
      memberships: {
        create: {
          userId: teacher2.id,
          role: UserRole.TEACHER,
          isOwner: true,
          status: MembershipStatus.ACTIVE,
        },
      },
    },
  });

  // 4. Create Student 1 in Tenant 1 (Tariq - no personal email required!)
  const student1 = await prisma.user.upsert({
    where: { username: 'student.tariq' },
    update: {},
    create: {
      username: 'student.tariq',
      displayName: 'طارق زياد',
      email: null, // Note: Students login by username only!
      passwordHash: commonPasswordHash,
      defaultRole: UserRole.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          gradeLevel: 'الصف الثالث الثانوي',
          parentPhone: '0501234567',
        },
      },
      memberships: {
        create: {
          tenantId: tenant1.id,
          role: UserRole.STUDENT,
          status: MembershipStatus.ACTIVE,
        },
      },
    },
  });

  // 5. Create Student 2 in Tenant 2 (Sara - no personal email required!)
  const student2 = await prisma.user.upsert({
    where: { username: 'student.sara' },
    update: {},
    create: {
      username: 'student.sara',
      displayName: 'سارة خالد',
      email: null,
      passwordHash: commonPasswordHash,
      defaultRole: UserRole.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          gradeLevel: 'الصف الأول الثانوي',
          parentPhone: '0507654321',
        },
      },
      memberships: {
        create: {
          tenantId: tenant2.id,
          role: UserRole.STUDENT,
          status: MembershipStatus.ACTIVE,
        },
      },
    },
  });

  // 6. Create Course in Tenant 1 (Physics)
  const course1 = await prisma.course.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: tenant1.id,
      teacherId: teacher1.id,
      title: 'الفيزياء للثانوية العامة: الكهربية والمغناطيسية',
      description: 'كورس شامل يغطي منهج الفيزياء مع تدريبات واختبارات دورية',
      subject: 'فيزياء',
      isActive: true,
      enrollments: {
        create: {
          tenantId: tenant1.id,
          studentId: student1.id,
          status: EnrollmentStatus.ACTIVE,
        },
      },
    },
  });

  // 7. Create Course in Tenant 2 (Chemistry)
  const course2 = await prisma.course.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      tenantId: tenant2.id,
      teacherId: teacher2.id,
      title: 'الكيمياء العضوية المتقدمة',
      description: 'شرح مبسط لأسس الكيمياء العضوية والتفاعلات الكيميائية',
      subject: 'كيمياء',
      isActive: true,
      enrollments: {
        create: {
          tenantId: tenant2.id,
          studentId: student2.id,
          status: EnrollmentStatus.ACTIVE,
        },
      },
    },
  });

  console.log('Seed completed successfully:');
  console.log(`- Admin: ${admin.username}`);
  console.log(`- Teacher 1: ${teacher1.username} -> Tenant: ${tenant1.slug} -> Course: ${course1.title}`);
  console.log(`- Teacher 2: ${teacher2.username} -> Tenant: ${tenant2.slug} -> Course: ${course2.title}`);
  console.log(`- Student 1: ${student1.username} in ${tenant1.name}`);
  console.log(`- Student 2: ${student2.username} in ${tenant2.name}`);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
