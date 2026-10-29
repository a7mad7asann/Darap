import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, UpdateQuestionDto } from '@darb/contracts';
import { CreateOptionNestDto } from './create-question.dto';

export class UpdateQuestionNestDto implements UpdateQuestionDto {
  @ApiProperty({
    description: 'Question text prompt',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(3, 2000, { message: 'يجب أن يكون نص السؤال بين 3 و 2000 حرف' })
  prompt?: string;

  @ApiProperty({
    description: 'Type of question',
    enum: QuestionType,
    required: false,
  })
  @IsEnum(QuestionType, { message: 'نوع السؤال غير صالح' })
  @IsOptional()
  questionType?: QuestionType;

  @ApiProperty({
    description: 'Points awarded for answering this question correctly',
    required: false,
  })
  @IsNumber({}, { message: 'درجة السؤال يجب أن تكون رقماً' })
  @IsPositive({ message: 'درجة السؤال يجب أن تكون أكبر من صفر' })
  @IsOptional()
  points?: number;

  @ApiProperty({
    description: 'Order index of question in exam',
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiProperty({
    description: 'List of options for this question',
    type: [CreateOptionNestDto],
    required: false,
  })
  @IsArray({ message: 'خيارات الإجابة يجب أن تكون في مصفوفة' })
  @ArrayMinSize(2, { message: 'يجب توفير خيارين اثنين على الأقل لكل سؤال' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionNestDto)
  @IsOptional()
  options?: CreateOptionNestDto[];
}
