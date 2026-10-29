import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { AssignmentStatus, UpdateAssignmentDto } from '@darb/contracts';

export class UpdateAssignmentNestDto implements UpdateAssignmentDto {
  @ApiProperty({
    description: 'Assignment title',
    example: 'واجب الحركة الدائرية وقوانين نيوتن (معدل)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 150, { message: 'يجب أن يكون عنوان التكليف بين 2 و 150 حرفاً' })
  title?: string;

  @ApiProperty({
    description: 'Assignment instructions and details',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 4000, { message: 'وصف التكليف يجب ألا يتجاوز 4000 حرف' })
  description?: string;

  @ApiProperty({
    description: 'Maximum score points for this assignment',
    required: false,
  })
  @IsNumber({}, { message: 'الدرجة القصوى يجب أن تكون رقماً' })
  @IsPositive({ message: 'الدرجة القصوى يجب أن تكون رقماً موجباً أكبر من الصفر' })
  @IsOptional()
  maxScore?: number;

  @ApiProperty({
    description: 'Optional due date timestamp',
    required: false,
  })
  @IsDateString({}, { message: 'تاريخ الاستحقاق يجب أن يكون بصيغة تاريخ صالحة' })
  @IsOptional()
  dueDate?: string | null;

  @ApiProperty({
    description: 'Assignment status',
    enum: AssignmentStatus,
    required: false,
  })
  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;
}
