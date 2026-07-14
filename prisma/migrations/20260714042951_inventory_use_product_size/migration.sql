/*
  Warnings:

  - The primary key for the `product_size_variant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[product_id,product_size_id]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,size_id]` on the table `product_size_variant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "inventory_product_id_key";

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "product_size_id" UUID;

-- AlterTable
ALTER TABLE "product_size_variant" DROP CONSTRAINT "product_size_variant_pkey",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "product_size_variant_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_product_size_id_key" ON "inventory"("product_id", "product_size_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_variant_product_id_size_id_key" ON "product_size_variant"("product_id", "size_id");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "product_size_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
