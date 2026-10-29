import { PrismaClient } from '@prisma/client';

describe('PostgreSQL Row-Level Security (RLS) & Multi-Tenant Isolation', () => {
  let appPrisma: PrismaClient;
  let adminPrisma: PrismaClient;
  let tenant1Id: string;
  let tenant2Id: string;
  let course1Id: string;
  let course2Id: string;
  let teacher1Id: string;

  beforeAll(async () => {
    // Admin client (superuser for test setup and verification)
    adminPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public',
        },
      },
    });

    // Application client using non-superuser, non-bypassrls role darb_app
    appPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://darb_app:darb_app_secret@localhost:5432/darb_dev?schema=public',
        },
      },
    });

    await adminPrisma.$connect();
    await appPrisma.$connect();

    // Fetch seeded tenants and courses
    const t1 = await adminPrisma.tenant.findUniqueOrThrow({
      where: { slug: 'al-andalus' },
    });
    const t2 = await adminPrisma.tenant.findUniqueOrThrow({
      where: { slug: 'al-noor' },
    });
    const c1 = await adminPrisma.course.findFirstOrThrow({
      where: { tenantId: t1.id },
    });
    const c2 = await adminPrisma.course.findFirstOrThrow({
      where: { tenantId: t2.id },
    });

    tenant1Id = t1.id;
    tenant2Id = t2.id;
    course1Id = c1.id;
    course2Id = c2.id;
    teacher1Id = t1.ownerId;
  });

  afterAll(async () => {
    await appPrisma.$disconnect();
    await adminPrisma.$disconnect();
  });

  it('Default Deny: should return 0 courses when queried without tenant context under RLS', async () => {
    await appPrisma.$transaction(async (tx) => {
      // Clear any session variable
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', '', true)`;

      const courses = await tx.course.findMany();
      expect(courses.length).toBe(0);
    });
  });

  it('Tenant 1 Isolation: should only see Tenant 1 courses when tenant 1 context is set', async () => {
    await appPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`;

      const courses = await tx.course.findMany();
      expect(courses.length).toBeGreaterThan(0);

      // Verify every returned course belongs strictly to Tenant 1
      for (const course of courses) {
        expect(course.tenantId).toBe(tenant1Id);
      }
      expect(courses.some((c) => c.id === course1Id)).toBe(true);
      expect(courses.some((c) => c.id === course2Id)).toBe(false);
    });
  });

  it('Negative Cross-Tenant Read Test: Tenant 1 cannot access Tenant 2 course by guessed UUID', async () => {
    await appPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`;

      // Attempt to access Course 2 (which belongs to Tenant 2) directly by ID
      const course = await tx.course.findFirst({
        where: { id: course2Id },
      });

      // PostgreSQL RLS must block this and return null
      expect(course).toBeNull();
    });
  });

  it('Tenant 2 Isolation: should only see Tenant 2 courses and not Tenant 1 courses', async () => {
    await appPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`;

      const courses = await tx.course.findMany();
      expect(courses.length).toBeGreaterThan(0);

      for (const course of courses) {
        expect(course.tenantId).toBe(tenant2Id);
      }
      expect(courses.some((c) => c.id === course2Id)).toBe(true);
      expect(courses.some((c) => c.id === course1Id)).toBe(false);

      // Negative read test for Tenant 2 accessing Course 1
      const forbiddenCourse = await tx.course.findFirst({
        where: { id: course1Id },
      });
      expect(forbiddenCourse).toBeNull();
    });
  });

  it('Negative Cross-Tenant Write Test: attempting to insert row for Tenant 2 under Tenant 1 context violates RLS policy', async () => {
    await expect(
      appPrisma.$transaction(async (tx) => {
        // Active context is Tenant 1
        await tx.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`;

        // Malicious or accidental attempt to write a course belonging to Tenant 2
        await tx.course.create({
          data: {
            tenantId: tenant2Id, // Violates WITH CHECK ("tenantId" = current_tenant)
            teacherId: teacher1Id,
            title: 'Malicious Cross-Tenant Course Injection',
          },
        });
      }),
    ).rejects.toThrow();
  });

  it('Connection Pool Safety: tenant context does NOT leak across successive transactions', async () => {
    // Transaction 1: sets Tenant 1
    await appPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`;
      const res = await tx.course.findMany();
      expect(res.length).toBeGreaterThan(0);
    });

    // Transaction 2: new transaction without setting tenant must not inherit Transaction 1's context
    await appPrisma.$transaction(async (tx) => {
      const res = await tx.course.findMany();
      // Should be 0 because SET LOCAL reset on commit
      expect(res.length).toBe(0);
    });
  });
});
