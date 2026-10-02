import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { SteadfastService } from './steadfast.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, SteadfastService],
  exports: [OrderService, SteadfastService],
})
export class OrderModule {}
