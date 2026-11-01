import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageHealthResult, StorageProvider } from '../files/storage.provider';

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageProvider: StorageProvider,
  ) {}

  async checkDatabaseHealth(timeoutMs = 3000): Promise<DatabaseHealthResult> {
    const start = Date.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timeout')), timeoutMs),
      );
      const queryPromise = this.prisma.$queryRaw`SELECT 1`;
      await Promise.race([queryPromise, timeoutPromise]);
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      this.logger.error(`Database health check failed: ${err?.message || 'unknown'}`);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: 'Database connection failed',
      };
    }
  }

  async checkStorageHealth(): Promise<StorageHealthResult> {
    try {
      return await this.storageProvider.checkHealth();
    } catch (err: any) {
      this.logger.warn(`Storage health check failed: ${err?.message || 'unknown'}`);
      return {
        status: 'down',
        provider: this.storageProvider.providerName || 'unknown',
        latencyMs: 0,
        details: { message: 'Storage check failed' },
      };
    }
  }
}
