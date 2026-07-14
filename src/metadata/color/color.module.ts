import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ColorController } from './color.controller';
import { ColorService } from './color.service';

@Module({
  imports: [AuthModule],
  controllers: [ColorController],
  providers: [ColorService],
  exports: [ColorService],
})
export class ColorModule {}
