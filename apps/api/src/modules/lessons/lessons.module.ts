import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { TeacherLessonsController } from './teacher-lessons.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [TeacherLessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
