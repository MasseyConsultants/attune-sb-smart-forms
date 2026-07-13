-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'OVER_LIMIT');

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "form_version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "source_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_form_id_status_idx" ON "submissions"("form_id", "status");

-- CreateIndex
CREATE INDEX "submissions_organization_id_status_idx" ON "submissions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "submissions_deleted_at_idx" ON "submissions"("deleted_at");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
