import { Module } from '@nestjs/common';
import { FounderVideoController } from './founder-video.controller';
import { FounderVideoService } from './founder-video.service';

@Module({
  controllers: [FounderVideoController],
  providers: [FounderVideoService],
  exports: [FounderVideoService],
})
export class FounderVideoModule {}
