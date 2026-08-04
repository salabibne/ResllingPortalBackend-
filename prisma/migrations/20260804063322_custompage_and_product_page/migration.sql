-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "custom_page" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "button_title" VARCHAR(100),
    "button_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_section" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "custom_page_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "image_url" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_description" TEXT,
    "button_text" VARCHAR(100),
    "button_link" TEXT,
    "content" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_page_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "custom_title" VARCHAR(255),
    "custom_description" TEXT,
    "banner_image_url" TEXT,
    "video_url" TEXT,
    "show_reviews" BOOLEAN NOT NULL DEFAULT false,
    "show_faq" BOOLEAN NOT NULL DEFAULT false,
    "show_related_items" BOOLEAN NOT NULL DEFAULT false,
    "is_landing_page" BOOLEAN NOT NULL DEFAULT false,
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_page_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_page_section" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_page_config_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "image_url" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_description" TEXT,
    "button_text" VARCHAR(100),
    "button_link" TEXT,
    "product_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "content" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_page_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_page_slug_key" ON "custom_page"("slug");

-- CreateIndex
CREATE INDEX "custom_page_slug_idx" ON "custom_page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_page_config_product_id_key" ON "product_page_config"("product_id");

-- AddForeignKey
ALTER TABLE "page_section" ADD CONSTRAINT "page_section_custom_page_id_fkey" FOREIGN KEY ("custom_page_id") REFERENCES "custom_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_page_config" ADD CONSTRAINT "product_page_config_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_page_section" ADD CONSTRAINT "product_page_section_product_page_config_id_fkey" FOREIGN KEY ("product_page_config_id") REFERENCES "product_page_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
