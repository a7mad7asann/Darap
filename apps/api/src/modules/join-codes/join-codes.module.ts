import { Module } from '@nestjs/common';
import { JoinCodesService } from './join-codes.service';
import { TeacherJoinCodesController } from './teacher-join-codes.controller';

@Module({
  controllers: [TeacherJoinCodesController],
  providers: [JoinCodesService],
  exports: [JoinCodesService],
})
export class JoinCodesModule {}
