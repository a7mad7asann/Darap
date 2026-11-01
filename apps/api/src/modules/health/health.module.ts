import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { FilesModule } from '../files/files.module';
import { HttpLoggingInterceptor } from '../../common/interceptors/http-logging.interceptor';

@Module({
  imports: [FilesModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [HealthService, MetricsService],
})
export class HealthModule {}
