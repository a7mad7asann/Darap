import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const connectionUrl =
      configService.get<string>('APP_DATABASE_URL') || configService.get<string>('DATABASE_URL');

    super({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL successfully.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL.');
  }

  /**
   * Executes a database operation within a transaction scoped to a specific tenant.
   * Uses PostgreSQL 'SET LOCAL app.current_tenant_id' to enforce Row Level Security (RLS).
   * Because SET LOCAL is transaction-scoped, it automatically resets on commit/rollback,
   * guaranteeing no tenant context leaks across pooled connections.
   */
  async withTenant<T>(
    tenantId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      throw new Error('Tenant context required: tenantId is null or empty');
    }

    return this.$transaction(async (tx) => {
      // Set tenant context for this transaction block only
      await tx.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`;
      return callback(tx);
    });
  }

  /**
   * Explicitly runs a transaction without tenant context (for admin or global auth checks).
   * Resets app.current_tenant_id to empty to prevent any stale context.
   */
  async withoutTenant<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
      return callback(tx);
    });
  }

  /**
   * Explicitly runs an administrative or trusted global operation with RLS bypass.
   * Transaction-scoped via SET LOCAL, automatically reset on transaction completion.
   */
  async withBypassRls<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return callback(tx);
    });
  }
}
