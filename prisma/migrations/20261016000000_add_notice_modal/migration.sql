-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateNoticeAudienceEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NoticeAudience') THEN
    CREATE TYPE "NoticeAudience" AS ENUM ('ALL', 'PUBLIC', 'RESELLER');
  END IF;
END
$$;

-- CreateCmsNoticeModalTable
CREATE TABLE "cms_notice_modal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "button_text" VARCHAR(100),
    "button_link" TEXT,
    "target_audience" "NoticeAudience" NOT NULL DEFAULT 'ALL',
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_notice_modal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cms_notice_modal_status_idx" ON "cms_notice_modal"("status");
CREATE INDEX "cms_notice_modal_target_audience_idx" ON "cms_notice_modal"("target_audience");
