import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CreateExamDto } from '@darb/contracts';

export class CreateExamNestDto implements CreateExamDto {
  @ApiProperty({
    description: 'Exam title',
    example: 'اختبار الفيزياء النصف فصلي - الحركة الدائرية',
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان الاختبار مطلوب' })
  @Length(2, 150, { message: 'يجب أن يكون عنوان الاختبار بين 2 و 150 حرفاً' })
  title!: string;

  @ApiProperty({
    description: 'Instructions and rules for the exam',
    example: 'أجب عن جميع الأسئلة. المدة 45 دقيقة ولديك محاولة واحدة فقط.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 4000, { message: 'التعليمات يجب ألا تتجاوز 4000 حرف' })
  instructions?: string;

  @ApiProperty({
    description: 'Exam duration in minutes',
    example: 45,
    required: false,
    default: 60,
  })
  @IsInt({ message: 'مدة الاختبار بالدقائق يجب أن تكون رقماً صحيحاً' })
  @Min(1, { message: 'مدة الاختبار يجب أن تكون دقيقة واحدة على الأقل' })
  @Max(300, { message: 'مدة الاختبار لا يمكن أن تتجاوز 300 دقيقة' })
  @IsOptional()
  durationMinutes?: number;

  @ApiProperty({
    description: 'Maximum attempts allowed per student',
    example: 1,
    required: false,
    default: 1,
  })
  @IsInt({ message: 'عدد المحاولات المسموح بها يجب أن يكون رقماً صحيحاً' })
  @Min(1, { message: 'عدد المحاولات يجب أن يكون 1 على الأقل' })
  @Max(10, { message: 'الحد الأقصى للمحاولات هو 10' })
  @IsOptional()
  maxAttempts?: number;

  @ApiProperty({
    description: 'Passing score cutoff threshold',
    example: 60,
    required: false,
  })
  @IsNumber({}, { message: 'درجة النجاح يجب أن تكون رقماً' })
  @IsPositive({ message: 'درجة النجاح يجب أن تكون رقماً موجباً' })
  @IsOptional()
  passingScore?: number;

  @ApiProperty({
    description: 'Exam availability start timestamp',
    example: '2026-11-01T08:00:00.000Z',
    required: false,
  })
  @IsDateString({}, { message: 'تاريخ بداية الاختبار غير صالح' })
  @IsOptional()
  startsAt?: string | null;

  @ApiProperty({
    description: 'Exam availability end timestamp',
    example: '2026-11-01T20:00:00.000Z',
    required: false,
  })
  @IsDateString({}, { message: 'تاريخ نهاية الاختبار غير صالح' })
  @IsOptional()
  endsAt?: string | null;
}
