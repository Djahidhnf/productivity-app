-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('RED', 'AMBER', 'BLUE', 'GREEN');

-- CreateEnum
CREATE TYPE "FreqType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('GREAT', 'GOOD', 'OKAY', 'LOW', 'ROUGH');

-- CreateTable
CREATE TABLE "task_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "priority" "Priority",
    "due" DATE,
    "dueTime" INTEGER,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "freqType" "FreqType" NOT NULL,
    "timesPerWeek" INTEGER,
    "startDate" DATE NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_logs" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "mood" "Mood" NOT NULL DEFAULT 'OKAY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_listId_idx" ON "tasks"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "habit_logs_habitId_date_key" ON "habit_logs"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_date_key" ON "journal_entries"("date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_listId_fkey" FOREIGN KEY ("listId") REFERENCES "task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
