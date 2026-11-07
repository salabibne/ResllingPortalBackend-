import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from "../../prisma/generated/client";
import { config } from 'dotenv';
import { createMySqlAdapter } from './mysql-adapter';

config();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: createMySqlAdapter(),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async ping() {
    await this.$queryRawUnsafe('SELECT 1');
  }
}
