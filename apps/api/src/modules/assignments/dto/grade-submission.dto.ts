import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { GradeSubmissionDto } from '@darb/contracts';

export class GradeSubmissionNestDto implements GradeSubmissionDto {
  @ApiProperty({
    description: 'Awarded numerical score (must be non-negative and <= assignment maxScore)',
    example: 85,
  })
  @IsNumber({}, { message: 'الدرجة يجب أن تكون رقماً' })
  @Min(0, { message: 'الدرجة لا يمكن أن تكون أقل من صفر' })
  @IsNotEmpty({ message: 'الدرجة مطلوبة' })
  score!: number;

  @ApiProperty({
    description: 'Teacher feedback and comments',
    example: 'أداء ممتاز، يرجى الانتباه فقط إلى صياغة المعادلة في السؤال الثالث.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 4000, { message: 'الملاحظات يجب ألا تتجاوز 4000 حرف' })
  feedback?: string;
}
