-- Homepage builder: promote section config from the JSON blob into real columns
-- and add a genuine draft/published split. Existing rows are preserved.

ALTER TABLE "page_section" ADD COLUMN "type" VARCHAR(50);
ALTER TABLE "page_section" ADD COLUMN "variant" VARCHAR(50);
ALTER TABLE "page_section" ADD COLUMN "settings" JSONB;
ALTER TABLE "page_section" ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "page_section" ADD COLUMN "status" "PageStatus" NOT NULL DEFAULT 'PUBLISHED';

UPDATE "page_section"
SET "type" = CASE LOWER(COALESCE("content"->>'type', 'banner'))
  WHEN 'hero' THEN 'hero'
  WHEN 'hero_banner' THEN 'hero'
  WHEN 'product' THEN 'products'
  WHEN 'products' THEN 'products'
  WHEN 'about' THEN 'story'
  WHEN 'story' THEN 'story'
  WHEN 'feature' THEN 'trust'
  WHEN 'features' THEN 'trust'
  WHEN 'custom_banner' THEN 'banner'
  WHEN 'custom' THEN 'banner'
  WHEN 'banner' THEN 'banner'
  ELSE 'banner'
END
WHERE "type" IS NULL;

UPDATE "page_section"
SET "variant" = CASE
  WHEN "type" = 'hero' THEN 'split-image-right'
  WHEN "type" = 'products' THEN 'grid'
  WHEN "type" = 'story' THEN 'image-left'
  WHEN "type" = 'trust' THEN 'icon-cards'
  ELSE 'default'
END
WHERE "variant" IS NULL;

UPDATE "page_section"
SET "is_enabled" = CASE
  WHEN "content"->>'isActive' = 'false' THEN false
  ELSE true
END
WHERE "content" IS NOT NULL;

CREATE INDEX "page_section_custom_page_id_status_sort_order_idx"
  ON "page_section"("custom_page_id", "status", "sort_order");

CREATE TABLE "media_asset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "url" TEXT NOT NULL,
  "filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);
