-- AlterTable
ALTER TABLE "order" ADD COLUMN     "courier_booking_state" VARCHAR(20),
ADD COLUMN     "courier_cod_amount" DECIMAL(12,2),
ADD COLUMN     "courier_tracking_link" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "order_courier_provider_courier_consignment_id_key" ON "order"("courier_provider", "courier_consignment_id");
