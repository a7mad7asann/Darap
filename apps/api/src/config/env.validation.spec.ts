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
});
