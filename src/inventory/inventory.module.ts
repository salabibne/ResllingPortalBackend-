import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryMonitorController } from './inventory-monitor.controller';
import { InventoryMonitorService } from './inventory-monitor.service';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController, InventoryMonitorController],
  providers: [InventoryService, InventoryMonitorService],
  exports: [InventoryService],
})
export class InventoryModule {}
