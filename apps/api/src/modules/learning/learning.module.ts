import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { StudentController } from './student.controller';
import { JoinCodesModule } from '../join-codes/join-codes.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [JoinCodesModule, FilesModule],
  controllers: [StudentController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
