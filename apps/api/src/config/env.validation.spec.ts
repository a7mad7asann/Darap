import { validateEnv } from './env.validation';

describe('Environment Variables Validation', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/darb_dev',
    SESSION_SECRET: 'super-secret-key-that-is-at-least-32-characters-long!',
    PORT: 4000,
    NODE_ENV: 'development',
    COOKIE_SECURE: false,
  };

  it('should succeed with valid configuration', () => {
    const config = validateEnv(validEnv);
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.SESSION_SECRET).toBe(validEnv.SESSION_SECRET);
  });

  it('should throw an error if SESSION_SECRET is shorter than 32 characters', () => {
    expect(() => {
      validateEnv({
        ...validEnv,
        SESSION_SECRET: 'short-secret',
      });
    }).toThrow(/SESSION_SECRET must be at least 32 characters/);
  });

  it('should throw an error if DATABASE_URL is missing', () => {
    const invalid = { ...validEnv };
    delete (invalid as any).DATABASE_URL;
    expect(() => {
      validateEnv(invalid);
    }).toThrow(/DATABASE_URL/);
  });

  it('should throw an error if NODE_ENV is an invalid enum value', () => {
    expect(() => {
      validateEnv({
        ...validEnv,
        NODE_ENV: 'invalid_env',
      });
    }).toThrow();
  });

  describe('Production Security Invariants', () => {
    const validProdEnv = {
      DATABASE_URL: 'postgresql://darb_admin:StrongProdPass987!@db.darb.internal:5432/darb_prod',
      SESSION_SECRET: 'k9#mP$vL2!xQ8@wZ5*jR1^nB4&tY7(uE3)sA6%dF0',
      PORT: 4000,
      NODE_ENV: 'production',
      COOKIE_SECURE: true,
      COOKIE_SAME_SITE: 'lax',
      ENABLE_SWAGGER: false,
    };

    it('should succeed with valid production configuration', () => {
      const config = validateEnv(validProdEnv);
      expect(config.NODE_ENV).toBe('production');
      expect(config.COOKIE_SECURE).toBe(true);
      expect(config.ENABLE_SWAGGER).toBe(false);
    });

    it('should throw an error in production if COOKIE_SECURE is false', () => {
      expect(() => {
        validateEnv({
          ...validProdEnv,
          COOKIE_SECURE: false,
        });
      }).toThrow(/COOKIE_SECURE must be set to true in production mode/);
    });

    it('should throw an error in production if COOKIE_SECURE is omitted (defaults to false)', () => {
      const noCookieSecure = { ...validProdEnv };
      delete (noCookieSecure as any).COOKIE_SECURE;
      expect(() => {
        validateEnv(noCookieSecure);
      }).toThrow(/COOKIE_SECURE must be set to true in production mode/);
    });

    it('should throw an error in production if SESSION_SECRET contains insecure placeholder words', () => {
      expect(() => {
        validateEnv({
          ...validProdEnv,
          SESSION_SECRET: 'change-this-to-a-very-secure-random-secret-at-least-32-chars',
        });
      }).toThrow(/SESSION_SECRET appears to be an insecure placeholder/);

      expect(() => {
        validateEnv({
          ...validProdEnv,
          SESSION_SECRET: 'super-secret-key-that-is-at-least-32-characters-long!',
        });
      }).toThrow(/SESSION_SECRET appears to be an insecure placeholder/);
    });

    it('should throw an error in production if DATABASE_URL contains default postgres credentials', () => {
      expect(() => {
        validateEnv({
          ...validProdEnv,
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/darb_dev',
        });
      }).toThrow(/DATABASE_URL uses default development credentials/);
    });

    it('should accept custom CORS_ALLOWED_ORIGINS and ENABLE_SWAGGER flags', () => {
      const config = validateEnv({
        ...validProdEnv,
        CORS_ALLOWED_ORIGINS: 'https://darb.edu,https://app.darb.edu',
        ENABLE_SWAGGER: true,
      });
      expect(config.CORS_ALLOWED_ORIGINS).toBe('https://darb.edu,https://app.darb.edu');
      expect(config.ENABLE_SWAGGER).toBe(true);
    });
  });
});
