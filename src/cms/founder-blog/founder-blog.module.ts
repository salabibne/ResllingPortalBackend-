import { Module } from '@nestjs/common';
import { FounderBlogController } from './founder-blog.controller';
import { FounderBlogService } from './founder-blog.service';

@Module({
  controllers: [FounderBlogController],
  providers: [FounderBlogService],
  exports: [FounderBlogService],
})
export class FounderBlogModule {}
