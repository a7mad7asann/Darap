import {
  sanitizeRequestId,
  normalizeRouteTemplate,
  redactString,
  redactSensitiveData,
} from './redaction.util';

describe('Redaction and Sanitization Utilities', () => {
  describe('sanitizeRequestId', () => {
    it('accepts valid alphanumeric, hyphenated, and underscored request IDs', () => {
      expect(sanitizeRequestId('req-1234_abcd')).toBe('req-1234_abcd');
      expect(sanitizeRequestId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      );
    });

    it('generates a new UUIDv4 when request ID is empty, invalid, or malicious', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(sanitizeRequestId('')).toMatch(uuidRegex);
      expect(sanitizeRequestId('   ')).toMatch(uuidRegex);
      expect(sanitizeRequestId(undefined)).toMatch(uuidRegex);
      expect(sanitizeRequestId(null)).toMatch(uuidRegex);
      expect(sanitizeRequestId('<script>alert(1)</script>')).toMatch(uuidRegex);
      expect(sanitizeRequestId('invalid char!')).toMatch(uuidRegex);
      expect(sanitizeRequestId('a'.repeat(65))).toMatch(uuidRegex); // over 64 chars
    });
  });

  describe('normalizeRouteTemplate', () => {
    it('strips query parameters and fragments', () => {
      expect(normalizeRouteTemplate('/api/v1/courses?status=published&sort=asc')).toBe(
        '/api/v1/courses',
      );
      expect(normalizeRouteTemplate('/api/v1/health/metrics#frag')).toBe('/api/v1/health/metrics');
    });

    it('replaces standard UUIDs with :id', () => {
      expect(
        normalizeRouteTemplate('/api/v1/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/sections'),
      ).toBe('/api/v1/courses/:id/sections');
      expect(
        normalizeRouteTemplate('/api/v1/files/6f2e82b7-a367-422f-87a3-e8dfd8e78a22/metadata'),
      ).toBe('/api/v1/files/:id/metadata');
    });

    it('replaces numeric IDs with :id', () => {
      expect(normalizeRouteTemplate('/api/v1/courses/42/lessons/100')).toBe(
        '/api/v1/courses/:id/lessons/:id',
      );
    });

    it('replaces long high-entropy tokens and upload tickets with :token', () => {
      expect(
        normalizeRouteTemplate(
          '/api/v1/storage/upload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ),
      ).toBe('/api/v1/storage/upload/:token');
    });

    it('collapses consecutive slashes and strips trailing slash', () => {
      expect(normalizeRouteTemplate('//api/v1///health//live/')).toBe('/api/v1/health/live');
      expect(normalizeRouteTemplate('/')).toBe('/');
    });
  });

  describe('redactString', () => {
    it('redacts Bearer tokens from authorization strings', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.xyz and more';
      expect(redactString(input)).toBe('Authorization: Bearer [REDACTED] and more');
    });

    it('redacts Basic auth credentials', () => {
      const input = 'Authorization: Basic dXNlcjpwYXNz';
      expect(redactString(input)).toBe('Authorization: Basic [REDACTED]');
    });

    it('redacts database connection passwords in connection strings', () => {
      const input =
        'Connecting to postgresql://darb_app:SuperSecret123!@db.internal:5432/darb_prod';
      expect(redactString(input)).toBe(
        'Connecting to postgresql://darb_app:[REDACTED]@db.internal:5432/darb_prod',
      );
    });

    it('redacts signed URL parameters like tickets and signatures', () => {
      const input =
        'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abcdef123456&ticket=987654321';
      const redacted = redactString(input);
      expect(redacted).toContain('X-Amz-Signature=[REDACTED]');
      expect(redacted).toContain('ticket=[REDACTED]');
      expect(redacted).not.toContain('abcdef123456');
      expect(redacted).not.toContain('987654321');
    });
  });

  describe('redactSensitiveData', () => {
    it('deeply redacts sensitive keys and values from objects and arrays', () => {
      const data = {
        username: 'teacher.ahmed',
        password: 'Password123!',
        nested: {
          secretKey: 'aws-secret-access-key',
          sessionToken: 'jwt.token.here',
          databaseUrl: 'postgresql://user:pass@localhost:5432/db',
          headers: {
            authorization: 'Bearer token123',
            cookie: 'darb_session=cookieVal123',
          },
          items: ['public', 'Bearer privateToken456', { token: 'innerSecret' }],
        },
      };

      const result = redactSensitiveData(data);

      expect(result.username).toBe('teacher.ahmed');
      expect(result.password).toBe('[REDACTED]');
      expect(result.nested.secretKey).toBe('[REDACTED]');
      expect(result.nested.sessionToken).toBe('[REDACTED]');
      expect(result.nested.databaseUrl).toBe('[REDACTED]');
      expect(result.nested.headers.authorization).toBe('[REDACTED]');
      expect(result.nested.headers.cookie).toBe('[REDACTED]');
      expect(result.nested.items[0]).toBe('public');
      expect(result.nested.items[1]).toBe('Bearer [REDACTED]');
      expect((result.nested.items[2] as any).token).toBe('[REDACTED]');
    });
  });
});
