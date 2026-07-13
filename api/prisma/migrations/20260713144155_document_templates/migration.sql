-- CreateEnum
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'UPLOADED',
    "failure_reason" TEXT,
    "original_key" TEXT NOT NULL,
    "pdf_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "page_count" INTEGER NOT NULL DEFAULT 0,
    "page_dimensions" JSONB NOT NULL DEFAULT '[]',
    "field_mappings" JSONB NOT NULL DEFAULT '[]',
    "organization_id" TEXT NOT NULL,
    "form_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_form_id_key" ON "document_templates"("form_id");

-- CreateIndex
CREATE INDEX "document_templates_organization_id_idx" ON "document_templates"("organization_id");

-- CreateIndex
CREATE INDEX "document_templates_deleted_at_idx" ON "document_templates"("deleted_at");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
