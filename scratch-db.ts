import { PrismaClient } from './prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  }),
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      phone: true,
      role: true,
      status: true,
    }
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error("Error testing withdrawal model:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
