-- AlterEnum
ALTER TYPE "WorkflowRunStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "artifact_bytes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "approval_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "message" TEXT,
    "decision" TEXT,
    "note" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_tokens_token_hash_key" ON "approval_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "approval_tokens_run_id_idx" ON "approval_tokens"("run_id");

-- CreateIndex
CREATE INDEX "approval_tokens_organization_id_idx" ON "approval_tokens"("organization_id");

-- AddForeignKey
ALTER TABLE "approval_tokens" ADD CONSTRAINT "approval_tokens_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
