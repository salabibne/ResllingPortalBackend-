import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateColorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'colorCode must be a valid hex color (e.g. #FF5733)' })
  colorCode?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
