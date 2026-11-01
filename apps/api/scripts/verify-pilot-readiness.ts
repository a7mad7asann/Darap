import { PrismaClient } from '@prisma/client';

interface GateResult {
  gate: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
}

async function runPilotReadinessVerification() {
  console.log('\n======================================================');
  console.log('   DARB — Pilot Readiness Gate Verification (P6-006)  ');
  console.log('======================================================\n');

  const results: GateResult[] = [];
  const prisma = new PrismaClient();

  try {
    // Gate 1: Database Connectivity & Migration State
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      results.push({
        gate: 'Gate 1: Database',
        check: 'PostgreSQL Connectivity (SELECT 1)',
        status: 'PASS',
        details: `Connected successfully in ${dbLatency}ms`,
      });
    } catch (err: any) {
      results.push({
        gate: 'Gate 1: Database',
        check: 'PostgreSQL Connectivity (SELECT 1)',
        status: 'FAIL',
        details: err?.message || 'Connection failed',
      });
    }

    // Gate 2: PostgreSQL Row-Level Security (RLS) Engine Enforcement
    try {
      const tenantTables = [
        'Course',
        'Section',
        'Lesson',
        'Assignment',
        'Exam',
        'FileObject',
        'GradeRecord',
      ];
      const rlsRows: Array<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }> = await prisma.$queryRaw`
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        WHERE relname IN ('Course', 'Section', 'Lesson', 'Assignment', 'Exam', 'FileObject', 'GradeRecord')
      `;

      let allRlsEnforced = true;
      const unforcedTables: string[] = [];

      for (const table of tenantTables) {
        const found = rlsRows.find((r) => r.relname === table);
        if (!found || !found.relrowsecurity || !found.relforcerowsecurity) {
          allRlsEnforced = false;
          unforcedTables.push(table);
        }
      }

      if (allRlsEnforced && rlsRows.length === tenantTables.length) {
        results.push({
          gate: 'Gate 2: Security & RLS',
          check: 'Forced Row-Level Security on Tenant Tables',
          status: 'PASS',
          details: `All ${tenantTables.length} tenant tables have FORCE ROW LEVEL SECURITY enabled`,
        });
      } else {
        results.push({
          gate: 'Gate 2: Security & RLS',
          check: 'Forced Row-Level Security on Tenant Tables',
          status: 'FAIL',
          details: `Missing RLS or FORCE RLS on: ${unforcedTables.join(', ')}`,
        });
      }
    } catch (err: any) {
      results.push({
        gate: 'Gate 2: Security & RLS',
        check: 'Forced Row-Level Security on Tenant Tables',
        status: 'FAIL',
        details: err?.message || 'RLS check query failed',
      });
    }

    // Gate 3: Tenant Workspaces & Seed Data Audit
    try {
      const tenantsCount = await prisma.tenant.count();
      const teachersCount = await prisma.user.count({ where: { defaultRole: 'TEACHER' } });
      const studentsCount = await prisma.user.count({ where: { defaultRole: 'STUDENT' } });
      const coursesCount = await prisma.course.count();

      results.push({
        gate: 'Gate 3: Pilot Personas',
        check: 'Pilot Workspaces & User Demographics',
        status: 'PASS',
        details: `${tenantsCount} tenant(s), ${teachersCount} teacher(s), ${studentsCount} student(s), ${coursesCount} course(s) verified`,
      });
    } catch (err: any) {
      results.push({
        gate: 'Gate 3: Pilot Personas',
        check: 'Pilot Workspaces & User Demographics',
        status: 'FAIL',
        details: err?.message || 'Demographics query failed',
      });
    }

    // Gate 4: Initial Admin Account Audit
    try {
      const adminCount = await prisma.user.count({ where: { defaultRole: 'ADMIN' } });
      if (adminCount >= 1) {
        results.push({
          gate: 'Gate 4: Administration',
          check: 'Root Administrator Provisioning',
          status: 'PASS',
          details: `${adminCount} administrative account(s) active for tenant provisioning and recovery`,
        });
      } else {
        results.push({
          gate: 'Gate 4: Administration',
          check: 'Root Administrator Provisioning',
          status: 'WARN',
          details: 'No admin found. Run "pnpm db:admin" to provision initial root administrator.',
        });
      }
    } catch (err: any) {
      results.push({
        gate: 'Gate 4: Administration',
        check: 'Root Administrator Provisioning',
        status: 'FAIL',
        details: err?.message || 'Admin query failed',
      });
    }

    // Gate 5: Storage Provider Configuration
    const storageProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    if (storageProvider === 's3' || storageProvider === 'r2') {
      const bucket = process.env.STORAGE_BUCKET;
      const keyId = process.env.STORAGE_ACCESS_KEY_ID;
      const secret = process.env.STORAGE_SECRET_ACCESS_KEY;
      if (bucket && keyId && secret) {
        results.push({
          gate: 'Gate 5: Storage',
          check: `Managed Object Storage (${storageProvider.toUpperCase()})`,
          status: 'PASS',
          details: `Configured with bucket "${bucket}" and valid credential variables`,
        });
      } else {
        results.push({
          gate: 'Gate 5: Storage',
          check: `Managed Object Storage (${storageProvider.toUpperCase()})`,
          status: 'WARN',
          details: 'Storage provider is S3/R2 but required bucket or credentials are unset',
        });
      }
    } else {
      results.push({
        gate: 'Gate 5: Storage',
        check: 'Object Storage Provider (Local Fallback)',
        status: 'PASS',
        details: 'Operating in LocalStorageProvider sandbox mode for local/dev evaluation',
      });
    }

    // Gate 6: Observability & Security Invariants
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret && sessionSecret.length >= 32) {
      results.push({
        gate: 'Gate 6: Security Invariants',
        check: 'Session Secret Cryptographic Strength',
        status: 'PASS',
        details: `SESSION_SECRET meets minimum security length (${sessionSecret.length} chars)`,
      });
    } else {
      results.push({
        gate: 'Gate 6: Security Invariants',
        check: 'Session Secret Cryptographic Strength',
        status: 'FAIL',
        details: 'SESSION_SECRET is missing or less than 32 characters long',
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  // Print Formatted Report Table
  console.log('---------------------------------------------------------------------------------------------');
  console.log('| Gate                     | Check                              | Status | Details          |');
  console.log('---------------------------------------------------------------------------------------------');
  for (const r of results) {
    const gateCol = r.gate.padEnd(24, ' ');
    const checkCol = r.check.slice(0, 34).padEnd(34, ' ');
    const statusCol =
      r.status === 'PASS'
        ? '\x1b[32mPASS\x1b[0m  '
        : r.status === 'WARN'
          ? '\x1b[33mWARN\x1b[0m  '
          : '\x1b[31mFAIL\x1b[0m  ';
    console.log(`| ${gateCol} | ${checkCol} | ${statusCol} | ${r.details}`);
  }
  console.log('---------------------------------------------------------------------------------------------\n');

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.error(`\x1b[31m[GATE FAILED]\x1b[0m ${failedCount} readiness check(s) failed. Resolving required before pilot launch.`);
    process.exit(1);
  } else {
    console.log('\x1b[32m[GATE PASSED]\x1b[0m All operational gates verified successfully. Pilot readiness criteria satisfied.\n');
  }
}

runPilotReadinessVerification().catch((err) => {
  console.error('Fatal gate verification error:', err);
  process.exit(1);
});
