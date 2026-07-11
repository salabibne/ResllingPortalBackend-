import { CommonStatus, UserRole } from '../../../prisma/generated/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @IsOptional()
  @IsString()
  pageName?: string;

  @IsString()
  @IsNotEmpty()
  presentDistrict!: string;

  @IsString()
  @IsNotEmpty()
  presentThana!: string;

  @IsString()
  @IsNotEmpty()
  permanentDistrict!: string;

  @IsString()
  @IsNotEmpty()
  permanentThana!: string;
}