import { PrismaClient, CommonStatus, UserRole } from './prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';

config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  }),
});

async function main() {
  const email = "admin@example.com";
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log("Admin user already exists");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name: "Admin User",
      email,
      phone: "+8801700000000",
      passwordHash,
      role: UserRole.ADMIN,
      OrganizationId: "00000000-0000-0000-0000-000000000000", // any uuid format
      status: CommonStatus.ACTIVE,
      presentDistrict: "Dhaka",
      presentThana: "Gulshan",
      permanentDistrict: "Dhaka",
      permanentThana: "Gulshan",
    }
  });

  console.log("Admin user created successfully:", user.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
