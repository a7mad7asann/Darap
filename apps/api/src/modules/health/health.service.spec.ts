import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';
import { LocalStorageProvider } from '../files/local-storage.provider';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockPrisma: Partial<PrismaService>;
  let storageProvider: LocalStorageProvider;

  beforeEach(() => {
    storageProvider = new LocalStorageProvider();
  });

  it('reports database up when SELECT 1 succeeds', async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    healthService = new HealthService(mockPrisma as PrismaService, storageProvider);

    const result = await healthService.checkDatabaseHealth();
    expect(result.status).toBe('up');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('reports database down safely without leaking connection errors', async () => {
    mockPrisma = {
      $queryRaw: jest
        .fn()
        .mockRejectedValue(new Error('FATAL: password authentication failed for user "darb_app"')),
    };
    healthService = new HealthService(mockPrisma as PrismaService, storageProvider);

    const result = await healthService.checkDatabaseHealth();
    expect(result.status).toBe('down');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBe('Database connection failed');
    expect(result.error).not.toContain('password');
    expect(result.error).not.toContain('darb_app');
  });

  it('reports storage up for local storage provider', async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    healthService = new HealthService(mockPrisma as PrismaService, storageProvider);

    const result = await healthService.checkStorageHealth();
    expect(result.status).toBe('up');
    expect(result.provider).toBe('local');
    expect(result.latencyMs).toBe(0);
  });
});
