import { IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveProductPageConfigDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsString()
  customDescription?: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  showReviews?: boolean;

  @IsOptional()
  @IsBoolean()
  showFaq?: boolean;

  @IsOptional()
  @IsBoolean()
  showRelatedItems?: boolean;

  @IsOptional()
  @IsBoolean()
  isLandingPage?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  sections?: any[];

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;

  @IsOptional()
  product?: any;
}
