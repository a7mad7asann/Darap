import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsAuthGuard } from './metrics-auth.guard';

describe('MetricsAuthGuard', () => {
  let guard: MetricsAuthGuard;
  let configService: ConfigService;

  const createMockContext = (
    headers: Record<string, string | undefined> = {},
    query: Record<string, string | undefined> = {},
  ) => {
    const request = {
      headers: { ...headers },
      query: { ...query },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe('When METRICS_AUTH_TOKEN is not configured', () => {
    beforeEach(() => {
      configService = new ConfigService({});
      guard = new MetricsAuthGuard(configService);
    });

    it('should allow access without any authorization header', () => {
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access even with arbitrary headers', () => {
      const context = createMockContext({ authorization: 'Bearer random' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('When METRICS_AUTH_TOKEN is configured', () => {
    const validToken = 'super-secure-metrics-token-987654321';

    beforeEach(() => {
      configService = new ConfigService({
        METRICS_AUTH_TOKEN: validToken,
      });
      guard = new MetricsAuthGuard(configService);
    });

    it('should allow access with correct Bearer token', () => {
      const context = createMockContext({
        authorization: `Bearer ${validToken}`,
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access with case-insensitive bearer keyword', () => {
      const context = createMockContext({
        authorization: `bearer ${validToken}`,
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      const context = createMockContext();
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Metrics authentication required');
    });

    it('should throw UnauthorizedException when authorization scheme is not Bearer', () => {
      const context = createMockContext({
        authorization: `Basic ${Buffer.from(`user:${validToken}`).toString('base64')}`,
      });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Invalid authorization format. Expected Bearer token',
      );
    });

    it('should throw UnauthorizedException when Bearer header is malformed', () => {
      const context1 = createMockContext({ authorization: 'Bearer' });
      expect(() => guard.canActivate(context1)).toThrow(
        'Invalid authorization format. Expected Bearer token',
      );

      const context2 = createMockContext({ authorization: 'Bearer token extra' });
      expect(() => guard.canActivate(context2)).toThrow(
        'Invalid authorization format. Expected Bearer token',
      );
    });

    it('should throw UnauthorizedException when token is incorrect', () => {
      const context = createMockContext({
        authorization: 'Bearer incorrect-token-12345',
      });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid metrics authorization token');
    });

    it('should never accept tokens passed via query parameters', () => {
      const context = createMockContext({}, { token: validToken, apiKey: validToken });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Metrics authentication required');
    });

    it('should never leak the secret token in any thrown error message', () => {
      try {
        const context = createMockContext({ authorization: 'Bearer wrong' });
        guard.canActivate(context);
        fail('Should have thrown UnauthorizedException');
      } catch (err: any) {
        expect(err.message).not.toContain(validToken);
      }
    });
  });
});
