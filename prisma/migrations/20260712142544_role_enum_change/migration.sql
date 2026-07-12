/*
  Warnings:

  - The values [Active,Deactivate,Pending] on the enum `CommonStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CommonStatus_new" AS ENUM ('ACTIVE', 'DEACTIVATED', 'PENDING');
ALTER TABLE "public"."user" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "status" TYPE "CommonStatus_new" USING ("status"::text::"CommonStatus_new");
ALTER TYPE "CommonStatus" RENAME TO "CommonStatus_old";
ALTER TYPE "CommonStatus_new" RENAME TO "CommonStatus";
DROP TYPE "public"."CommonStatus_old";
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'PENDING';
