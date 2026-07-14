import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SizeController } from './size.controller';
import { SizeService } from './size.service';

@Module({
  imports: [AuthModule],
  controllers: [SizeController],
  providers: [SizeService],
  exports: [SizeService],
})
export class SizeModule {}
