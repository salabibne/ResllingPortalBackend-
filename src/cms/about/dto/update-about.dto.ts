import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class UpdateAboutDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  youtubeLink?: string;

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

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
