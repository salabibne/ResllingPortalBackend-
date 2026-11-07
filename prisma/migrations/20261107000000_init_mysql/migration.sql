-- CreateTable
CREATE TABLE `user` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `secondaryPhone` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `refresh_token_hash` TEXT NULL,
    `refresh_token_expires_at` DATETIME(3) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_EXECUTIVE', 'INVENTOR', 'RESELLER', 'USER') NOT NULL DEFAULT 'USER',
    `organization_id` CHAR(36) NOT NULL,
    `image_url` TEXT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `page_name` VARCHAR(100) NULL,
    `present_district` VARCHAR(100) NOT NULL,
    `present_thana` VARCHAR(100) NOT NULL,
    `permanent_district` VARCHAR(100) NOT NULL,
    `permanent_thana` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_phone_key`(`phone`),
    UNIQUE INDEX `user_page_name_key`(`page_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `image_url` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subcategory` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `subcategory_id` CHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brand` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `image_url` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `subcategory_id` CHAR(36) NULL,
    `child_category_id` CHAR(36) NULL,
    `brand_id` CHAR(36) NOT NULL,
    `purchase_price` DECIMAL(12, 2) NOT NULL,
    `old_price` DECIMAL(12, 2) NOT NULL,
    `new_price` DECIMAL(12, 2) NOT NULL,
    `reseller_price` DECIMAL(12, 2) NOT NULL,
    `video_url` TEXT NULL,
    `unit` VARCHAR(50) NOT NULL DEFAULT 'piece',
    `description` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `show_as_new_arrival` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_image` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `image_url` TEXT NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `color` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `color_code` VARCHAR(7) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_color_variant` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `color_id` CHAR(36) NOT NULL,

    UNIQUE INDEX `product_color_variant_product_id_color_id_key`(`product_id`, `color_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `size` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_size_variant` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `size_id` CHAR(36) NOT NULL,

    UNIQUE INDEX `product_size_variant_product_id_size_id_key`(`product_id`, `size_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `age_variant` (
    `id` CHAR(36) NOT NULL,
    `age_range` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_age_variant` (
    `product_id` CHAR(36) NOT NULL,
    `age_variant_id` CHAR(36) NOT NULL,

    PRIMARY KEY (`product_id`, `age_variant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `product_size_id` CHAR(36) NULL,
    `current_stock` INTEGER NOT NULL DEFAULT 0,
    `cost_per_unit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `supplier_name` VARCHAR(255) NOT NULL,
    `supplier_mobile` VARCHAR(20) NOT NULL,
    `stock_limit_alert` INTEGER NOT NULL DEFAULT 10,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_product_id_product_size_id_key`(`product_id`, `product_size_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transaction` (
    `id` CHAR(36) NOT NULL,
    `inventory_id` CHAR(36) NOT NULL,
    `transaction_quantity` INTEGER NOT NULL,
    `stock_before` INTEGER NOT NULL,
    `stock_after` INTEGER NOT NULL,
    `stock_type` ENUM('STOCK_IN', 'STOCK_OUT') NOT NULL,
    `purpose` ENUM('SELL', 'PURCHASE', 'RETURN', 'DAMAGE') NOT NULL,
    `reference` VARCHAR(100) NULL,
    `performed_by` CHAR(36) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart` (
    `id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `promo_code` VARCHAR(50) NULL,
    `courier_charge` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_item` (
    `id` CHAR(36) NOT NULL,
    `cart_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `product_size_id` CHAR(36) NULL,
    `product_color_id` CHAR(36) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cart_item_cart_id_product_id_product_size_id_product_color_i_key`(`cart_id`, `product_id`, `product_size_id`, `product_color_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` CHAR(36) NOT NULL,
    `order_ref` VARCHAR(50) NULL,
    `cart_id` CHAR(36) NULL,
    `customer_id` CHAR(36) NOT NULL,
    `is_reseller_order` BOOLEAN NOT NULL DEFAULT false,
    `reseller_id` CHAR(36) NULL,
    `customer_name` VARCHAR(255) NULL,
    `customer_phone` VARCHAR(20) NULL,
    `customer_secondary_phone` VARCHAR(20) NULL,
    `customer_email` VARCHAR(255) NULL,
    `customer_district` VARCHAR(100) NULL,
    `customer_thana` VARCHAR(100) NULL,
    `reseller_subtotal` DECIMAL(12, 2) NULL,
    `reseller_sell_price` DECIMAL(12, 2) NULL,
    `reseller_profit` DECIMAL(12, 2) NULL,
    `is_advance_courier_paid` BOOLEAN NOT NULL DEFAULT false,
    `advance_courier_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('DUE', 'PAID', 'PARTIAL', 'CANCELLED') NOT NULL DEFAULT 'DUE',
    `payment_method` ENUM('CASH_ON_DELIVERY', 'BKASH', 'NAGAD', 'BANK_TRANSFER') NOT NULL,
    `processing_status` ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `order_processed_by` CHAR(36) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `courier_charge` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `shipping_address` TEXT NULL,
    `notes` TEXT NULL,
    `courier_provider` VARCHAR(50) NULL DEFAULT 'STEADFAST',
    `courier_consignment_id` VARCHAR(100) NULL,
    `courier_tracking_code` VARCHAR(100) NULL,
    `courier_status` VARCHAR(50) NULL,
    `courier_submitted_at` DATETIME(3) NULL,
    `courier_last_synced_at` DATETIME(3) NULL,
    `courier_delivery_type` INTEGER NOT NULL DEFAULT 0,
    `courier_notes` TEXT NULL,
    `courier_tracking_link` TEXT NULL,
    `courier_cod_amount` DECIMAL(12, 2) NULL,
    `courier_booking_state` VARCHAR(20) NULL,
    `courier_return_request_id` INTEGER NULL,
    `courier_return_status` VARCHAR(30) NULL,
    `courier_return_reason` TEXT NULL,
    `courier_return_requested_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_order_ref_key`(`order_ref`),
    UNIQUE INDEX `order_courier_provider_courier_consignment_id_key`(`courier_provider`, `courier_consignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courier_pickup` (
    `id` CHAR(36) NOT NULL,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'STEADFAST',
    `address_id` INTEGER NULL,
    `police_station_id` INTEGER NULL,
    `address` TEXT NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `note` TEXT NULL,
    `estim_qty` INTEGER NULL,
    `status` VARCHAR(30) NULL,
    `provider_response` JSON NULL,
    `created_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `courier_pickup_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `product_size_id` CHAR(36) NULL,
    `product_color_id` CHAR(36) NULL,
    `quantity` INTEGER NOT NULL,
    `snapshot_price` DECIMAL(12, 2) NOT NULL,
    `reseller_unit_cost` DECIMAL(12, 2) NULL,
    `reseller_selling_price` DECIMAL(12, 2) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `order_item_product_id_idx`(`product_id`),
    UNIQUE INDEX `order_item_order_id_product_id_product_size_id_product_color_key`(`order_id`, `product_id`, `product_size_id`, `product_color_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_social_media` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `icon_name` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_contact` (
    `id` CHAR(36) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `telegram` VARCHAR(255) NULL,
    `whatsapp` VARCHAR(255) NULL,
    `facebook` VARCHAR(255) NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_brand` (
    `id` CHAR(36) NOT NULL,
    `logo_url` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_hero` (
    `id` CHAR(36) NOT NULL,
    `hero_title` VARCHAR(255) NOT NULL,
    `hero_subtitle` TEXT NOT NULL,
    `button_text_1` VARCHAR(50) NOT NULL,
    `button_link_1` TEXT NOT NULL,
    `button_text_2` VARCHAR(50) NULL,
    `button_link_2` TEXT NULL,
    `image_url` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_about` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `youtube_link` TEXT NOT NULL,
    `button_text_1` VARCHAR(50) NOT NULL,
    `button_link_1` TEXT NOT NULL,
    `button_text_2` VARCHAR(50) NULL,
    `button_link_2` TEXT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_section` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `image_url` TEXT NULL,
    `card_title` VARCHAR(255) NOT NULL,
    `card_icon` VARCHAR(100) NOT NULL,
    `card_description` TEXT NOT NULL,
    `card_button` VARCHAR(50) NULL,
    `card_link` TEXT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_founder` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `image_url` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_founder_blog` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `image_url` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_founder_video` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `video_link` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_team` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `designation` VARCHAR(255) NOT NULL,
    `image_url` TEXT NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_page` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content` TEXT NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `button_title` VARCHAR(100) NULL,
    `button_link` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_page_slug_key`(`slug`),
    INDEX `custom_page_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_section` (
    `id` CHAR(36) NOT NULL,
    `custom_page_id` CHAR(36) NOT NULL,
    `type` VARCHAR(50) NULL,
    `variant` VARCHAR(50) NULL,
    `settings` JSON NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `title` VARCHAR(255) NULL,
    `subtitle` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `image_url` TEXT NULL,
    `images` JSON NOT NULL,
    `image_description` TEXT NULL,
    `button_text` VARCHAR(100) NULL,
    `button_link` TEXT NULL,
    `content` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `page_section_custom_page_id_status_sort_order_idx`(`custom_page_id`, `status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_asset` (
    `id` CHAR(36) NOT NULL,
    `url` TEXT NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_page_config` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `custom_title` VARCHAR(255) NULL,
    `custom_description` TEXT NULL,
    `banner_image_url` TEXT NULL,
    `video_url` TEXT NULL,
    `show_reviews` BOOLEAN NOT NULL DEFAULT false,
    `show_faq` BOOLEAN NOT NULL DEFAULT false,
    `show_related_items` BOOLEAN NOT NULL DEFAULT false,
    `is_landing_page` BOOLEAN NOT NULL DEFAULT false,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_page_config_product_id_key`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_page_section` (
    `id` CHAR(36) NOT NULL,
    `product_page_config_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NULL,
    `subtitle` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `image_url` TEXT NULL,
    `images` JSON NOT NULL,
    `image_description` TEXT NULL,
    `button_text` VARCHAR(100) NULL,
    `button_link` TEXT NULL,
    `product_ids` JSON NOT NULL,
    `content` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_announcement` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `link_url` TEXT NULL,
    `expires_date` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_api` (
    `id` CHAR(36) NOT NULL,
    `api_name` VARCHAR(100) NOT NULL,
    `api_url` TEXT NOT NULL,
    `credentials` TEXT NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_document` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `version` VARCHAR(20) NULL DEFAULT '1.0',
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `legal_document_slug_key`(`slug`),
    INDEX `legal_document_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courier_setting` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL DEFAULT 'Courier Charge Policy',
    `chargeText` TEXT NOT NULL,
    `default_charge` DECIMAL(12, 2) NOT NULL DEFAULT 120.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal` (
    `id` CHAR(36) NOT NULL,
    `reseller_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payout_method` ENUM('BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'CASH') NOT NULL,
    `account_details` TEXT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reseller_notes` TEXT NULL,
    `transaction_id` VARCHAR(100) NULL,
    `proof_image_url` TEXT NULL,
    `admin_notes` TEXT NULL,
    `processed_by` CHAR(36) NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `withdrawal_reseller_id_idx`(`reseller_id`),
    INDEX `withdrawal_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_notice_modal` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `image_url` TEXT NULL,
    `button_text` VARCHAR(100) NULL,
    `button_link` TEXT NULL,
    `target_audience` ENUM('ALL', 'PUBLIC', 'RESELLER') NOT NULL DEFAULT 'ALL',
    `status` ENUM('ACTIVE', 'DEACTIVATED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cms_notice_modal_status_idx`(`status`),
    INDEX `cms_notice_modal_target_audience_idx`(`target_audience`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_ticket` (
    `id` CHAR(36) NOT NULL,
    `ticket_id` VARCHAR(50) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `reason` ENUM('PAYMENT', 'ORDER', 'TECHNICAL', 'PRODUCT', 'OTHER') NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `admin_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_ticket_ticket_id_key`(`ticket_id`),
    INDEX `support_ticket_user_id_idx`(`user_id`),
    INDEX `support_ticket_status_idx`(`status`),
    INDEX `support_ticket_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subcategory` ADD CONSTRAINT `subcategory_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_category` ADD CONSTRAINT `child_category_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_child_category_id_fkey` FOREIGN KEY (`child_category_id`) REFERENCES `child_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image` ADD CONSTRAINT `product_image_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_color_variant` ADD CONSTRAINT `product_color_variant_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_color_variant` ADD CONSTRAINT `product_color_variant_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `color`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_size_variant` ADD CONSTRAINT `product_size_variant_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_size_variant` ADD CONSTRAINT `product_size_variant_size_id_fkey` FOREIGN KEY (`size_id`) REFERENCES `size`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_age_variant` ADD CONSTRAINT `product_age_variant_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_age_variant` ADD CONSTRAINT `product_age_variant_age_variant_id_fkey` FOREIGN KEY (`age_variant_id`) REFERENCES `age_variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_size_id_fkey` FOREIGN KEY (`product_size_id`) REFERENCES `product_size_variant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transaction` ADD CONSTRAINT `inventory_transaction_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart` ADD CONSTRAINT `cart_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item` ADD CONSTRAINT `cart_item_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item` ADD CONSTRAINT `cart_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item` ADD CONSTRAINT `cart_item_product_size_id_fkey` FOREIGN KEY (`product_size_id`) REFERENCES `product_size_variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item` ADD CONSTRAINT `cart_item_product_color_id_fkey` FOREIGN KEY (`product_color_id`) REFERENCES `product_color_variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_reseller_id_fkey` FOREIGN KEY (`reseller_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_product_size_id_fkey` FOREIGN KEY (`product_size_id`) REFERENCES `product_size_variant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_product_color_id_fkey` FOREIGN KEY (`product_color_id`) REFERENCES `product_color_variant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_section` ADD CONSTRAINT `page_section_custom_page_id_fkey` FOREIGN KEY (`custom_page_id`) REFERENCES `custom_page`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_page_config` ADD CONSTRAINT `product_page_config_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_page_section` ADD CONSTRAINT `product_page_section_product_page_config_id_fkey` FOREIGN KEY (`product_page_config_id`) REFERENCES `product_page_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal` ADD CONSTRAINT `withdrawal_reseller_id_fkey` FOREIGN KEY (`reseller_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal` ADD CONSTRAINT `withdrawal_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket` ADD CONSTRAINT `support_ticket_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
