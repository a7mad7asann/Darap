import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const INSECURE_SECRET_PATTERNS = [
  'change-this',
  'super-secret-key',
  'development-secret',
  'placeholder',
  'secret-key',
  'darb_secret',
  'default_secret',
  '123456',
];

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1024)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  APP_DATABASE_URL?: string;

  @IsString()
  @MinLength(32, {
    message: 'SESSION_SECRET must be at least 32 characters long for security',
  })
  SESSION_SECRET!: string;

  @IsString()
  @IsOptional()
  COOKIE_NAME: string = 'darb_session';

  @IsBoolean()
  @IsOptional()
  COOKIE_SECURE: boolean = false;

  @IsString()
  @IsOptional()
  COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL_MS: number = 60000;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_MAX_ATTEMPTS: number = 5;

  @IsString()
  @IsOptional()
  NEXT_PUBLIC_APP_URL?: string;

  @IsString()
  @IsOptional()
  CORS_ALLOWED_ORIGINS?: string;

  @IsBoolean()
  @IsOptional()
  ENABLE_SWAGGER?: boolean;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorDetails = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment variable validation failed: ${errorDetails}`);
  }

  // Production-specific strict security invariants
  if (validatedConfig.NODE_ENV === Environment.Production) {
    // 1. In production, COOKIE_SECURE MUST be true to prevent plaintext cookie transmission
    if (validatedConfig.COOKIE_SECURE !== true) {
      throw new Error(
        'Production security violation: COOKIE_SECURE must be set to true in production mode.',
      );
    }

    // 2. In production, SESSION_SECRET cannot match known insecure/development placeholder patterns
    const secretLower = validatedConfig.SESSION_SECRET.toLowerCase();
    const hasInsecurePattern = INSECURE_SECRET_PATTERNS.some((pattern) =>
      secretLower.includes(pattern),
    );
    if (hasInsecurePattern) {
      throw new Error(
        'Production security violation: SESSION_SECRET appears to be an insecure placeholder or development secret. Generate a cryptographically secure random string with at least 32 bytes (e.g. openssl rand -base64 32).',
      );
    }

    // 3. In production, DATABASE_URL must not contain insecure default passwords like 'postgres:postgres' or 'postgrespassword'
    if (
      validatedConfig.DATABASE_URL.includes('postgres:postgres@') ||
      validatedConfig.DATABASE_URL.includes('postgres:postgrespassword@')
    ) {
      throw new Error(
        'Production security violation: DATABASE_URL uses default development credentials. Configure secure managed database credentials in production.',
      );
    }
  }

  return validatedConfig;
}
