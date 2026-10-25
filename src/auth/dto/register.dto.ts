import { UserRole } from '../../../prisma/generated/client';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * Self-service registration. The server accepts only customer and reseller
 * accounts — staff roles are provisioned by an administrator, and the account
 * status is always decided server-side (never trusted from the client).
 */
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

  @IsIn([UserRole.USER, UserRole.RESELLER])
  role!: UserRole;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

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
