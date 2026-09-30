-- Every row gets an owning account. Existing data belongs to the original
-- account ('owner'); the default only backfills and is dropped afterwards.
ALTER TABLE "task_lists" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "tasks" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "habits" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "notes" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "finance_entries" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'owner';

ALTER TABLE "task_lists" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "habits" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "notes" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "finance_entries" ALTER COLUMN "userId" DROP DEFAULT;

DROP INDEX "finance_entries_date_idx";

CREATE INDEX "task_lists_userId_idx" ON "task_lists"("userId");
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");
CREATE INDEX "habits_userId_idx" ON "habits"("userId");
CREATE INDEX "notes_userId_idx" ON "notes"("userId");
CREATE INDEX "finance_entries_userId_date_idx" ON "finance_entries"("userId", "date");
