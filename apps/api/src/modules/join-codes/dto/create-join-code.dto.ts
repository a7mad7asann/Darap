import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreateJoinCodeDto } from '@darb/contracts';

export class CreateJoinCodeNestDto implements CreateJoinCodeDto {
  @ApiProperty({
    description: 'Optional maximum number of students who can redeem this code',
    example: 30,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxUses?: number;

  @ApiProperty({
    description: 'Optional validity duration in days from creation',
    example: 7,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiresInDays?: number;
}
