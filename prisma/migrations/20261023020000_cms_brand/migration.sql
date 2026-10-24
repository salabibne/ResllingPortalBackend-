-- CreateTable
CREATE TABLE "cms_brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "logo_url" VARCHAR(500),
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_brand_pkey" PRIMARY KEY ("id")
);
