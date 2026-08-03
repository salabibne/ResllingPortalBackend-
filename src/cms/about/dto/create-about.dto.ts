import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateAboutDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  youtubeLink!: string;

  @IsString()
  @IsNotEmpty()
  buttonText1!: string;

  @IsString()
  @IsNotEmpty()
  buttonLink1!: string;

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
