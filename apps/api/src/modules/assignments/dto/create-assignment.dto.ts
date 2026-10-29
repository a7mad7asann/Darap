import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { CreateAssignmentDto } from '@darb/contracts';

export class CreateAssignmentNestDto implements CreateAssignmentDto {
  @ApiProperty({
    description: 'Assignment title',
    example: 'واجب الحركة الدائرية وقوانين نيوتن',
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان التكليف مطلوب' })
  @Length(2, 150, { message: 'يجب أن يكون عنوان التكليف بين 2 و 150 حرفاً' })
  title!: string;

  @ApiProperty({
    description: 'Assignment instructions and details',
    example: 'قم بحل المسائل في الصفحة 45 وإرفاق خطوات الحل كاملة',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 4000, { message: 'وصف التكليف يجب ألا يتجاوز 4000 حرف' })
  description?: string;

  @ApiProperty({
    description: 'Maximum score points for this assignment',
    example: 100,
    required: false,
  })
  @IsNumber({}, { message: 'الدرجة القصوى يجب أن تكون رقماً' })
  @IsPositive({ message: 'الدرجة القصوى يجب أن تكون رقماً موجباً أكبر من الصفر' })
  @IsOptional()
  maxScore?: number;

  @ApiProperty({
    description: 'Optional due date timestamp',
    example: '2026-11-15T23:59:59.000Z',
    required: false,
  })
  @IsDateString({}, { message: 'تاريخ الاستحقاق يجب أن يكون بصيغة تاريخ صالحة' })
  @IsOptional()
  dueDate?: string | null;
}
