import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { SubcategoryModule } from './subcategory/subcategory.module';
import { ChildCategoryModule } from './child-category/child-category.module';
import { BrandModule } from './brand/brand.module';
import { ColorModule } from './color/color.module';
import { SizeModule } from './size/size.module';
import { AgeVariantModule } from './age-variant/age-variant.module';

@Module({
  imports: [
    CategoryModule,
    SubcategoryModule,
    ChildCategoryModule,
    BrandModule,
    ColorModule,
    SizeModule,
    AgeVariantModule,
  ],
})
export class MetadataModule {}
