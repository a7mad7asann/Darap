import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { FilesModule } from '../files/files.module';
import { HttpLoggingInterceptor } from '../../common/interceptors/http-logging.interceptor';

@Module({
  imports: [FilesModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    MetricsService,
    MetricsAuthGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [HealthService, MetricsService, MetricsAuthGuard],
})
export class HealthModule {}
