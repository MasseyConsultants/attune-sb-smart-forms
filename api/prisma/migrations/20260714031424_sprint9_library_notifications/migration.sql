-- CreateEnum
CREATE TYPE "LibraryTemplateScope" AS ENUM ('PUBLIC', 'ORG');

-- CreateTable
CREATE TABLE "library_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" "LibraryTemplateScope" NOT NULL DEFAULT 'PUBLIC',
    "schema" JSONB NOT NULL,
    "workflow" JSONB,
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "organization_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "library_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_templates_slug_key" ON "library_templates"("slug");

-- CreateIndex
CREATE INDEX "library_templates_scope_category_idx" ON "library_templates"("scope", "category");

-- CreateIndex
CREATE INDEX "library_templates_organization_id_idx" ON "library_templates"("organization_id");

-- CreateIndex
CREATE INDEX "library_templates_deleted_at_idx" ON "library_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_read_at_idx" ON "notifications"("organization_id", "read_at");

-- AddForeignKey
ALTER TABLE "library_templates" ADD CONSTRAINT "library_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
