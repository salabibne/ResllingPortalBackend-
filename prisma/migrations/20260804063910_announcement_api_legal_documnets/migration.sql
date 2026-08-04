-- CreateTable
CREATE TABLE "cms_announcement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "link_url" TEXT,
    "expires_date" TIMESTAMP(3),
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_api" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_name" VARCHAR(100) NOT NULL,
    "api_url" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "description" TEXT,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_api_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "version" VARCHAR(20) DEFAULT '1.0',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_slug_key" ON "legal_document"("slug");

-- CreateIndex
CREATE INDEX "legal_document_slug_idx" ON "legal_document"("slug");
