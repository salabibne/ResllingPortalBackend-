import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getHello() {
    return {
      message: 'Aarham Apparel backend is running',
    };
  }

  async getHealth() {
    await this.prismaService.ping();

    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
