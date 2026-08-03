-- CreateTable
CREATE TABLE "cms_social_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "icon_name" VARCHAR(100) NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_social_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "telegram" VARCHAR(255),
    "whatsapp" VARCHAR(255),
    "facebook" VARCHAR(255),
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_hero" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hero_title" VARCHAR(255) NOT NULL,
    "hero_subtitle" TEXT NOT NULL,
    "button_text_1" VARCHAR(50) NOT NULL,
    "button_link_1" TEXT NOT NULL,
    "button_text_2" VARCHAR(50),
    "button_link_2" TEXT,
    "image_url" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_about" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "youtube_link" TEXT NOT NULL,
    "button_text_1" VARCHAR(50) NOT NULL,
    "button_link_1" TEXT NOT NULL,
    "button_text_2" VARCHAR(50),
    "button_link_2" TEXT,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_about_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_section" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "card_title" VARCHAR(255) NOT NULL,
    "card_icon" VARCHAR(100) NOT NULL,
    "card_description" TEXT NOT NULL,
    "card_button" VARCHAR(50),
    "card_link" TEXT,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_founder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_founder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_founder_blog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_founder_blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_founder_video" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "video_link" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CommonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_founder_video_pkey" PRIMARY KEY ("id")
);
