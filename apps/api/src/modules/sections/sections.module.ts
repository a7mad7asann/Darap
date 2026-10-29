import { Module } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { TeacherSectionsController } from './teacher-sections.controller';

@Module({
  controllers: [TeacherSectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
