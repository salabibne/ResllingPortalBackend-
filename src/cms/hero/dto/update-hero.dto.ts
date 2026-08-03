import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateHeroDto {
  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  buttonText1?: string;

  @IsString()
  @IsOptional()
  buttonLink1?: string;

  @IsString()
  @IsOptional()
  buttonText2?: string;

  @IsString()
  @IsOptional()
  buttonLink2?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
