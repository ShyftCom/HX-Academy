-- Add isTerminal to lead_statuses
ALTER TABLE "lead_statuses" ADD COLUMN "isTerminal" BOOLEAN NOT NULL DEFAULT false;

-- Set Won and Lost as terminal (by their seeded IDs)
UPDATE "lead_statuses" SET "isTerminal" = true WHERE id IN ('won', 'lost');

-- Create lead_activities table
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedById" TEXT,
    "performedByName" TEXT NOT NULL DEFAULT 'System',
    "performedByRole" TEXT NOT NULL DEFAULT 'system',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "lead_activities_leadId_idx" ON "lead_activities"("leadId");
CREATE INDEX "lead_activities_performedById_idx" ON "lead_activities"("performedById");
CREATE INDEX "lead_activities_createdAt_idx" ON "lead_activities"("createdAt");

-- Foreign key
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
