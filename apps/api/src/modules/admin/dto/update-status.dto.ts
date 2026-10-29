import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { AdminResetPasswordDto, UpdateUserStatusDto } from '@darb/contracts';

export class UpdateUserStatusNestDto implements UpdateUserStatusDto {
  @ApiProperty({ description: 'Whether the account is active' })
  @IsBoolean()
  isActive!: boolean;
}

export class AdminResetPasswordNestDto implements AdminResetPasswordDto {
  @ApiProperty({ description: 'New temporary password assigned by administrator' })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @Length(6, 128)
  newPassword!: string;

  @ApiProperty({ description: 'Reason for password reset', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
