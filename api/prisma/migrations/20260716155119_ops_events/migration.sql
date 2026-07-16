-- CreateEnum
CREATE TYPE "OpsEventKind" AS ENUM ('API_ERROR', 'SECURITY');

-- CreateEnum
CREATE TYPE "OpsEventSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "ops_events" (
    "id" TEXT NOT NULL,
    "kind" "OpsEventKind" NOT NULL,
    "severity" "OpsEventSeverity" NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status_code" INTEGER,
    "method" TEXT,
    "path" TEXT,
    "request_id" TEXT,
    "organization_id" TEXT,
    "user_id" TEXT,
    "ip" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_events_kind_created_at_idx" ON "ops_events"("kind", "created_at");

-- CreateIndex
CREATE INDEX "ops_events_type_idx" ON "ops_events"("type");

-- CreateIndex
CREATE INDEX "ops_events_severity_created_at_idx" ON "ops_events"("severity", "created_at");

-- CreateIndex
CREATE INDEX "ops_events_organization_id_idx" ON "ops_events"("organization_id");

-- CreateIndex
CREATE INDEX "ops_events_created_at_idx" ON "ops_events"("created_at");
