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

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

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

  return validatedConfig;
}
