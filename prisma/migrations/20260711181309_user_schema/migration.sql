/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('superAdmin', 'manager', 'Salesman', 'inventor', 'Reseller');

-- CreateEnum
CREATE TYPE "CommonStatus" AS ENUM ('Active', 'Deactivate', 'Pending');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "secondaryPhone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "organization_id" UUID NOT NULL,
    "image_url" TEXT,
    "status" "CommonStatus" NOT NULL DEFAULT 'Pending',
    "page_name" VARCHAR(100),
    "present_district" VARCHAR(100) NOT NULL,
    "present_thana" VARCHAR(100) NOT NULL,
    "permanent_district" VARCHAR(100) NOT NULL,
    "permanent_thana" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_page_name_key" ON "user"("page_name");
