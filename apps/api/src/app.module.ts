import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SectionsModule } from './modules/sections/sections.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { JoinCodesModule } from './modules/join-codes/join-codes.module';
import { FilesModule } from './modules/files/files.module';
import { LearningModule } from './modules/learning/learning.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ExamsModule } from './modules/exams/exams.module';
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
    SectionsModule,
    LessonsModule,
    JoinCodesModule,
    FilesModule,
    LearningModule,
    AssignmentsModule,
    ExamsModule,
    AdminModule,
  ],
})
export class AppModule {}
