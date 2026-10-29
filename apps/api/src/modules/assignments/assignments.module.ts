import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { TeacherAssignmentsController } from './teacher-assignments.controller';
import { StudentAssignmentsController } from './student-assignments.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [TeacherAssignmentsController, StudentAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
