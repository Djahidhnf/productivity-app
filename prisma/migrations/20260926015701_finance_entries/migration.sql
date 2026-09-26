-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_entries_date_idx" ON "finance_entries"("date");
