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

  describe('Storage Configuration Validation', () => {
    it('should throw an error if STORAGE_PROVIDER is s3 but STORAGE_BUCKET is missing', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          STORAGE_PROVIDER: 's3',
          STORAGE_ACCESS_KEY_ID: 'valid-access-key-id',
          STORAGE_SECRET_ACCESS_KEY: 'valid-secret-access-key-12345678',
        });
      }).toThrow(/STORAGE_BUCKET is required/);
    });

    it('should throw an error if STORAGE_PROVIDER is s3 but credentials are missing', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          STORAGE_PROVIDER: 's3',
          STORAGE_BUCKET: 'darb-assets',
        });
      }).toThrow(/STORAGE_ACCESS_KEY_ID is required/);
    });

    it('should throw an error if STORAGE_PROVIDER is r2 but STORAGE_ENDPOINT is missing', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          STORAGE_PROVIDER: 'r2',
          STORAGE_BUCKET: 'darb-assets',
          STORAGE_ACCESS_KEY_ID: 'valid-access-key-id',
          STORAGE_SECRET_ACCESS_KEY: 'valid-secret-access-key-12345678',
        });
      }).toThrow(/STORAGE_ENDPOINT is required when STORAGE_PROVIDER is R2/);
    });

    it('should throw an error in production if storage credentials use placeholder strings', () => {
      expect(() => {
        validateEnv({
          DATABASE_URL:
            'postgresql://darb_admin:StrongProdPass987!@db.darb.internal:5432/darb_prod',
          SESSION_SECRET: 'k9#mP$vL2!xQ8@wZ5*jR1^nB4&tY7(uE3)sA6%dF0',
          PORT: 4000,
          NODE_ENV: 'production',
          COOKIE_SECURE: true,
          STORAGE_PROVIDER: 's3',
          STORAGE_BUCKET: 'darb-assets',
          STORAGE_ACCESS_KEY_ID: 'placeholder-key',
          STORAGE_SECRET_ACCESS_KEY: 'secret-key-123456',
        });
      }).toThrow(
        /STORAGE_ACCESS_KEY_ID or STORAGE_SECRET_ACCESS_KEY contains insecure placeholder words/,
      );
    });

    it('should succeed with valid S3 and R2 configuration', () => {
      const s3Config = validateEnv({
        ...validEnv,
        STORAGE_PROVIDER: 's3',
        STORAGE_BUCKET: 'darb-assets',
        STORAGE_REGION: 'eu-central-1',
        STORAGE_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        STORAGE_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });
      expect(s3Config.STORAGE_PROVIDER).toBe('s3');
      expect(s3Config.STORAGE_BUCKET).toBe('darb-assets');

      const r2Config = validateEnv({
        ...validEnv,
        STORAGE_PROVIDER: 'r2',
        STORAGE_BUCKET: 'darb-assets',
        STORAGE_ENDPOINT: 'https://abc123def456.r2.cloudflarestorage.com',
        STORAGE_ACCESS_KEY_ID: 'r2-access-key-id',
        STORAGE_SECRET_ACCESS_KEY: 'r2-secret-key-1234567890',
      });
      expect(r2Config.STORAGE_PROVIDER).toBe('r2');
      expect(r2Config.STORAGE_ENDPOINT).toBe('https://abc123def456.r2.cloudflarestorage.com');
    });
  });

  describe('COOKIE_DOMAIN Configuration Validation', () => {
    it('should allow valid domain names with or without leading dot', () => {
      const config1 = validateEnv({
        ...validEnv,
        COOKIE_DOMAIN: 'darb.example.com',
      });
      expect(config1.COOKIE_DOMAIN).toBe('darb.example.com');

      const config2 = validateEnv({
        ...validEnv,
        COOKIE_DOMAIN: '.darb.example.com',
      });
      expect(config2.COOKIE_DOMAIN).toBe('.darb.example.com');

      const config3 = validateEnv({
        ...validEnv,
        COOKIE_DOMAIN: 'localhost',
      });
      expect(config3.COOKIE_DOMAIN).toBe('localhost');
    });

    it('should throw an error if COOKIE_DOMAIN is an empty string', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          COOKIE_DOMAIN: '   ',
        });
      }).toThrow(/COOKIE_DOMAIN cannot be an empty string/);
    });

    it('should throw an error if COOKIE_DOMAIN contains protocol, path, port, or whitespace', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          COOKIE_DOMAIN: 'https://darb.example.com',
        });
      }).toThrow(/Domain must not contain protocol, path, port, or whitespace/);

      expect(() => {
        validateEnv({
          ...validEnv,
          COOKIE_DOMAIN: 'darb.example.com:4000',
        });
      }).toThrow(/Domain must not contain protocol, path, port, or whitespace/);

      expect(() => {
        validateEnv({
          ...validEnv,
          COOKIE_DOMAIN: 'darb example com',
        });
      }).toThrow(/Domain must not contain protocol, path, port, or whitespace/);
    });

    it('should throw an error if COOKIE_DOMAIN has invalid formatting', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          COOKIE_DOMAIN: 'darb..example.com',
        });
      }).toThrow(/Invalid COOKIE_DOMAIN format/);
    });

    it('should leave COOKIE_DOMAIN undefined when omitted', () => {
      const config = validateEnv(validEnv);
      expect(config.COOKIE_DOMAIN).toBeUndefined();
    });
  });

  describe('METRICS_AUTH_TOKEN Configuration Validation', () => {
    it('should accept valid METRICS_AUTH_TOKEN in development', () => {
      const config = validateEnv({
        ...validEnv,
        METRICS_AUTH_TOKEN: 'dev-token-12345',
      });
      expect(config.METRICS_AUTH_TOKEN).toBe('dev-token-12345');
    });

    it('should throw an error if METRICS_AUTH_TOKEN is an empty string', () => {
      expect(() => {
        validateEnv({
          ...validEnv,
          METRICS_AUTH_TOKEN: '   ',
        });
      }).toThrow(/METRICS_AUTH_TOKEN cannot be an empty string/);
    });

    it('should throw an error in production if METRICS_AUTH_TOKEN is too short (< 16 chars)', () => {
      expect(() => {
        validateEnv({
          DATABASE_URL:
            'postgresql://darb_admin:StrongProdPass987!@db.darb.internal:5432/darb_prod',
          SESSION_SECRET: 'k9#mP$vL2!xQ8@wZ5*jR1^nB4&tY7(uE3)sA6%dF0',
          PORT: 4000,
          NODE_ENV: 'production',
          COOKIE_SECURE: true,
          METRICS_AUTH_TOKEN: 'short-token',
        });
      }).toThrow(
        /METRICS_AUTH_TOKEN must be at least 16 characters and cannot use insecure placeholder values/,
      );
    });

    it('should throw an error in production if METRICS_AUTH_TOKEN contains insecure placeholder words', () => {
      expect(() => {
        validateEnv({
          DATABASE_URL:
            'postgresql://darb_admin:StrongProdPass987!@db.darb.internal:5432/darb_prod',
          SESSION_SECRET: 'k9#mP$vL2!xQ8@wZ5*jR1^nB4&tY7(uE3)sA6%dF0',
          PORT: 4000,
          NODE_ENV: 'production',
          COOKIE_SECURE: true,
          METRICS_AUTH_TOKEN: 'super-secret-key-1234567890',
        });
      }).toThrow(
        /METRICS_AUTH_TOKEN must be at least 16 characters and cannot use insecure placeholder values/,
      );
    });

    it('should accept strong METRICS_AUTH_TOKEN in production', () => {
      const config = validateEnv({
        DATABASE_URL: 'postgresql://darb_admin:StrongProdPass987!@db.darb.internal:5432/darb_prod',
        SESSION_SECRET: 'k9#mP$vL2!xQ8@wZ5*jR1^nB4&tY7(uE3)sA6%dF0',
        PORT: 4000,
        NODE_ENV: 'production',
        COOKIE_SECURE: true,
        METRICS_AUTH_TOKEN: 'a8b7c6d5e4f3210987654321fedcba09',
      });
      expect(config.METRICS_AUTH_TOKEN).toBe('a8b7c6d5e4f3210987654321fedcba09');
    });

    it('should leave METRICS_AUTH_TOKEN undefined when omitted', () => {
      const config = validateEnv(validEnv);
      expect(config.METRICS_AUTH_TOKEN).toBeUndefined();
    });
  });
});
