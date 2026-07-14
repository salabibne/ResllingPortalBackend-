import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AgeVariantController } from './age-variant.controller';
import { AgeVariantService } from './age-variant.service';

@Module({
  imports: [AuthModule],
  controllers: [AgeVariantController],
  providers: [AgeVariantService],
  exports: [AgeVariantService],
})
export class AgeVariantModule {}
