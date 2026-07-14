import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'colorCode must be a valid hex color (e.g. #FF5733)' })
  colorCode!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
