import { Module } from '@nestjs/common';
import { FounderController } from './founder.controller';
import { FounderService } from './founder.service';

@Module({
  controllers: [FounderController],
  providers: [FounderService],
  exports: [FounderService],
})
export class FounderModule {}
