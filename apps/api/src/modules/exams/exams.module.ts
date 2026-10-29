import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { TeacherExamsController } from './teacher-exams.controller';
import { StudentExamsController } from './student-exams.controller';

@Module({
  controllers: [TeacherExamsController, StudentExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
