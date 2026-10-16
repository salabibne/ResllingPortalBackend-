-- CreateSupportTicketReasonEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketReason') THEN
    CREATE TYPE "SupportTicketReason" AS ENUM ('PAYMENT', 'ORDER', 'TECHNICAL', 'PRODUCT', 'OTHER');
  END IF;
END
$$;

-- CreateSupportTicketStatusEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus') THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  END IF;
END
$$;

-- CreateSupportTicketTable
CREATE TABLE IF NOT EXISTS "support_ticket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" "SupportTicketReason" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_ticket_ticket_id_key" UNIQUE ("ticket_id"),
    CONSTRAINT "support_ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_user_id_idx" ON "support_ticket"("user_id");
CREATE INDEX IF NOT EXISTS "support_ticket_status_idx" ON "support_ticket"("status");
CREATE INDEX IF NOT EXISTS "support_ticket_ticket_id_idx" ON "support_ticket"("ticket_id");
