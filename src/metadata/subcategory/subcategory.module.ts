import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SubcategoryController } from './subcategory.controller';
import { SubcategoryService } from './subcategory.service';

@Module({
  imports: [AuthModule],
  controllers: [SubcategoryController],
  providers: [SubcategoryService],
  exports: [SubcategoryService],
})
export class SubcategoryModule {}
