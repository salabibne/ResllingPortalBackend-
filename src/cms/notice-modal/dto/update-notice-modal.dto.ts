import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CommonStatus, NoticeAudience } from '../../../../prisma/generated/client';

export class UpdateNoticeModalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  buttonText?: string;

  @IsOptional()
  @IsString()
  buttonLink?: string;

  @IsOptional()
  @IsEnum(NoticeAudience)
  targetAudience?: NoticeAudience;

  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
