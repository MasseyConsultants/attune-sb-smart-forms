-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "filled_at" TIMESTAMP(3),
ADD COLUMN     "filled_document_bytes" INTEGER,
ADD COLUMN     "filled_document_key" TEXT;
