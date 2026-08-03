import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../../../prisma/generated/client';

export class CreateFounderVideoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  videoLink!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(CommonStatus)
  @IsOptional()
  status?: CommonStatus;
}
