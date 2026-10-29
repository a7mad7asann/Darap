import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { TeacherCoursesController } from './teacher-courses.controller';
import { LessonsModule } from '../lessons/lessons.module';
import { JoinCodesModule } from '../join-codes/join-codes.module';

@Module({
  imports: [LessonsModule, JoinCodesModule],
  controllers: [TeacherCoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
