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

export enum StorageProviderType {
  Local = 'local',
  S3 = 's3',
  R2 = 'r2',
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

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsOptional()
  METRICS_AUTH_TOKEN?: string;

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

  @IsEnum(StorageProviderType)
  @IsOptional()
  STORAGE_PROVIDER: StorageProviderType = StorageProviderType.Local;

  @IsString()
  @IsOptional()
  STORAGE_BUCKET?: string;

  @IsString()
  @IsOptional()
  STORAGE_REGION?: string;

  @IsString()
  @IsOptional()
  STORAGE_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  STORAGE_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  STORAGE_SECRET_ACCESS_KEY?: string;

  @IsBoolean()
  @IsOptional()
  STORAGE_FORCE_PATH_STYLE?: boolean;

  @IsNumber()
  @IsOptional()
  STORAGE_SIGNED_URL_TTL_SECONDS?: number;

  @IsNumber()
  @IsOptional()
  STORAGE_MAX_FILE_SIZE_BYTES?: number;
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

  // Validation for optional COOKIE_DOMAIN if provided
  if (validatedConfig.COOKIE_DOMAIN !== undefined) {
    const domain = validatedConfig.COOKIE_DOMAIN.trim();
    if (domain === '') {
      throw new Error('COOKIE_DOMAIN cannot be an empty string if provided.');
    }
    if (domain.includes('/') || domain.includes(':') || /\s/.test(domain)) {
      throw new Error(
        `Invalid COOKIE_DOMAIN: "${domain}". Domain must not contain protocol, path, port, or whitespace (e.g. "example.com" or ".example.com").`,
      );
    }
    const domainPattern =
      /^\.?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainPattern.test(domain)) {
      throw new Error(
        `Invalid COOKIE_DOMAIN format: "${domain}". Expected valid domain format (e.g. "darb.example.com" or ".darb.example.com").`,
      );
    }
  }

  // Validation for optional METRICS_AUTH_TOKEN if provided
  if (validatedConfig.METRICS_AUTH_TOKEN !== undefined) {
    const token = validatedConfig.METRICS_AUTH_TOKEN.trim();
    if (token === '') {
      throw new Error('METRICS_AUTH_TOKEN cannot be an empty string if provided.');
    }
    if (validatedConfig.NODE_ENV === Environment.Production) {
      const tokenLower = token.toLowerCase();
      const hasInsecurePattern = INSECURE_SECRET_PATTERNS.some((pattern) =>
        tokenLower.includes(pattern),
      );
      if (hasInsecurePattern || token.length < 16) {
        throw new Error(
          'Production security violation: METRICS_AUTH_TOKEN must be at least 16 characters and cannot use insecure placeholder values.',
        );
      }
    }
  }

  // Storage configuration invariants for S3 and R2
  if (
    validatedConfig.STORAGE_PROVIDER === StorageProviderType.S3 ||
    validatedConfig.STORAGE_PROVIDER === StorageProviderType.R2
  ) {
    if (!validatedConfig.STORAGE_BUCKET || validatedConfig.STORAGE_BUCKET.trim() === '') {
      throw new Error(
        `Storage configuration error: STORAGE_BUCKET is required when STORAGE_PROVIDER is '${validatedConfig.STORAGE_PROVIDER}'.`,
      );
    }
    if (
      !validatedConfig.STORAGE_ACCESS_KEY_ID ||
      validatedConfig.STORAGE_ACCESS_KEY_ID.trim() === ''
    ) {
      throw new Error(
        `Storage configuration error: STORAGE_ACCESS_KEY_ID is required when STORAGE_PROVIDER is '${validatedConfig.STORAGE_PROVIDER}'.`,
      );
    }
    if (
      !validatedConfig.STORAGE_SECRET_ACCESS_KEY ||
      validatedConfig.STORAGE_SECRET_ACCESS_KEY.trim() === ''
    ) {
      throw new Error(
        `Storage configuration error: STORAGE_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER is '${validatedConfig.STORAGE_PROVIDER}'.`,
      );
    }
    if (
      validatedConfig.STORAGE_PROVIDER === StorageProviderType.R2 &&
      (!validatedConfig.STORAGE_ENDPOINT || validatedConfig.STORAGE_ENDPOINT.trim() === '')
    ) {
      throw new Error(
        'Storage configuration error: STORAGE_ENDPOINT is required when STORAGE_PROVIDER is R2 (e.g. https://<account_id>.r2.cloudflarestorage.com).',
      );
    }
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

    // 4. In production, if using S3 or R2, credentials must not match known insecure placeholders
    if (
      validatedConfig.STORAGE_PROVIDER === StorageProviderType.S3 ||
      validatedConfig.STORAGE_PROVIDER === StorageProviderType.R2
    ) {
      const accessLower = (validatedConfig.STORAGE_ACCESS_KEY_ID ?? '').toLowerCase();
      const secretLower = (validatedConfig.STORAGE_SECRET_ACCESS_KEY ?? '').toLowerCase();
      const hasInsecureStorageKey = INSECURE_SECRET_PATTERNS.some(
        (pattern) => accessLower.includes(pattern) || secretLower.includes(pattern),
      );
      if (hasInsecureStorageKey) {
        throw new Error(
          'Production security violation: STORAGE_ACCESS_KEY_ID or STORAGE_SECRET_ACCESS_KEY contains insecure placeholder words.',
        );
      }
    }
  }

  return validatedConfig;
}
