-- AlterTable
ALTER TABLE "order" ADD COLUMN     "courier_return_reason" TEXT,
ADD COLUMN     "courier_return_request_id" INTEGER,
ADD COLUMN     "courier_return_requested_at" TIMESTAMP(3),
ADD COLUMN     "courier_return_status" VARCHAR(30);

-- CreateTable
CREATE TABLE "courier_pickup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(50) NOT NULL DEFAULT 'STEADFAST',
    "address_id" INTEGER,
    "police_station_id" INTEGER,
    "address" TEXT NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "note" TEXT,
    "estim_qty" INTEGER,
    "status" VARCHAR(30),
    "provider_response" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_pickup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_pickup_created_at_idx" ON "courier_pickup"("created_at");
