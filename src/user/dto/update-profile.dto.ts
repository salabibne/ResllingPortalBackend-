import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Fields a user may change on their own profile. Email/phone are login identities and stay read-only. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pageName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{10}|\d{13}|\d{17})?$/, { message: 'NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যার হতে হবে' })
  nidNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  presentDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  presentThana?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  presentAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  permanentDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  permanentThana?: string;
}
