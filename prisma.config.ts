
import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";
config();
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || env("DATABASE_URL")
  },
});
