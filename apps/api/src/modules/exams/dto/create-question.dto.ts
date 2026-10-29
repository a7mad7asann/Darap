import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOptionDto, CreateQuestionDto, QuestionType } from '@darb/contracts';

export class CreateOptionNestDto implements CreateOptionDto {
  @ApiProperty({
    description: 'Option content text',
    example: 'القوة تساوي الكتلة في التسارع (F = ma)',
  })
  @IsString()
  @IsNotEmpty({ message: 'نص الخيار مطلوب' })
  @Length(1, 1000, { message: 'يجب ألا يتجاوز نص الخيار 1000 حرف' })
  content!: string;

  @ApiProperty({
    description: 'Flag indicating if this option is the correct answer',
    example: true,
  })
  @IsBoolean({ message: 'تحديد صحة الإجابة يجب أن يكون قيمة منطقية (صح/خطأ)' })
  isCorrect!: boolean;

  @ApiProperty({
    description: 'Order index for display',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

export class CreateQuestionNestDto implements CreateQuestionDto {
  @ApiProperty({
    description: 'Question text prompt',
    example: 'ما هو نص قانون نيوتن الثاني للحركة؟',
  })
  @IsString()
  @IsNotEmpty({ message: 'نص السؤال مطلوب' })
  @Length(3, 2000, { message: 'يجب أن يكون نص السؤال بين 3 و 2000 حرف' })
  prompt!: string;

  @ApiProperty({
    description: 'Type of question',
    enum: QuestionType,
    required: false,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  @IsEnum(QuestionType, { message: 'نوع السؤال غير صالح' })
  @IsOptional()
  questionType?: QuestionType;

  @ApiProperty({
    description: 'Points awarded for answering this question correctly',
    example: 5,
    required: false,
    default: 1,
  })
  @IsNumber({}, { message: 'درجة السؤال يجب أن تكون رقماً' })
  @IsPositive({ message: 'درجة السؤال يجب أن تكون أكبر من صفر' })
  @IsOptional()
  points?: number;

  @ApiProperty({
    description: 'Order index of question in exam',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiProperty({
    description: 'List of options for this question (at least 2)',
    type: [CreateOptionNestDto],
  })
  @IsArray({ message: 'خيارات الإجابة يجب أن تكون في مصفوفة' })
  @ArrayMinSize(2, { message: 'يجب توفير خيارين اثنين على الأقل لكل سؤال' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionNestDto)
  options!: CreateOptionNestDto[];
}
