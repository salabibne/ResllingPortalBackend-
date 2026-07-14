-- CreateEnum
CREATE TYPE "InventoryTxType" AS ENUM ('STOCK_IN', 'STOCK_OUT');

-- CreateEnum
CREATE TYPE "InventoryTxPurpose" AS ENUM ('SELL', 'PURCHASE', 'RETURN', 'DAMAGE');

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category_id" UUID NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "child_category_id" UUID,
    "brand_id" UUID NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "old_price" DECIMAL(12,2) NOT NULL,
    "new_price" DECIMAL(12,2) NOT NULL,
    "reseller_price" DECIMAL(12,2) NOT NULL,
    "video_url" TEXT,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'piece',
    "description" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "show_as_new_arrival" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "color_code" VARCHAR(7) NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_color_variant" (
    "product_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,

    CONSTRAINT "product_color_variant_pkey" PRIMARY KEY ("product_id","color_id")
);

-- CreateTable
CREATE TABLE "size" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size_variant" (
    "product_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,

    CONSTRAINT "product_size_variant_pkey" PRIMARY KEY ("product_id","size_id")
);

-- CreateTable
CREATE TABLE "age_variant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "age_range" VARCHAR(50) NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "age_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_age_variant" (
    "product_id" UUID NOT NULL,
    "age_variant_id" UUID NOT NULL,

    CONSTRAINT "product_age_variant_pkey" PRIMARY KEY ("product_id","age_variant_id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "cost_per_unit" DECIMAL(12,2) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "supplier_mobile" VARCHAR(20) NOT NULL,
    "stock_limit_alert" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_id" UUID NOT NULL,
    "transaction_quantity" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "stock_type" "InventoryTxType" NOT NULL,
    "purpose" "InventoryTxPurpose" NOT NULL,
    "reference" VARCHAR(100),
    "performed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"("product_id");

-- AddForeignKey
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_category" ADD CONSTRAINT "child_category_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_child_category_id_fkey" FOREIGN KEY ("child_category_id") REFERENCES "child_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_variant" ADD CONSTRAINT "product_color_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_variant" ADD CONSTRAINT "product_color_variant_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_variant" ADD CONSTRAINT "product_size_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_variant" ADD CONSTRAINT "product_size_variant_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "size"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_age_variant" ADD CONSTRAINT "product_age_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_age_variant" ADD CONSTRAINT "product_age_variant_age_variant_id_fkey" FOREIGN KEY ("age_variant_id") REFERENCES "age_variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
