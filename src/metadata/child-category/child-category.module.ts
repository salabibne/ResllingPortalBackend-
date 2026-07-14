import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ChildCategoryController } from './child-category.controller';
import { ChildCategoryService } from './child-category.service';

@Module({
  imports: [AuthModule],
  controllers: [ChildCategoryController],
  providers: [ChildCategoryService],
  exports: [ChildCategoryService],
})
export class ChildCategoryModule {}
