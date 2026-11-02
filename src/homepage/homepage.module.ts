import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';
import { PageBuilderController } from './page-builder.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HomepageController, PageBuilderController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}
