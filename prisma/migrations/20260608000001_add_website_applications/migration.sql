-- AlterTable leads
ALTER TABLE "leads" ADD COLUMN "selectedPlanId" TEXT;
ALTER TABLE "leads" ADD COLUMN "adminNotes" TEXT;

-- AddForeignKey leads.selectedPlanId -> subscription_plans
ALTER TABLE "leads" ADD CONSTRAINT "leads_selectedPlanId_fkey" FOREIGN KEY ("selectedPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable file_requirements
CREATE TABLE "file_requirements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "allowedTypes" TEXT NOT NULL DEFAULT 'image/*,.pdf',
    "maxSizeMb" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable application_files
CREATE TABLE "application_files" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requirementId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey application_files.leadId -> leads
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey application_files.requirementId -> file_requirements
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "file_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
