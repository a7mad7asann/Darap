import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { JoinCodesModule } from './modules/join-codes/join-codes.module';
import { FilesModule } from './modules/files/files.module';
import { LearningModule } from './modules/learning/learning.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    CoursesModule,
    LessonsModule,
    JoinCodesModule,
    FilesModule,
    LearningModule,
    AdminModule,
  ],
})
export class AppModule {}
