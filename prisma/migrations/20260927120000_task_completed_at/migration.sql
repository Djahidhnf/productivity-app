-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: existing done tasks start their 72h purge clock now.
UPDATE "tasks" SET "completedAt" = CURRENT_TIMESTAMP WHERE "done" = true;
