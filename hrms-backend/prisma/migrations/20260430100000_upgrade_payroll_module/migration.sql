-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PerformanceReviewPeriod" AS ENUM ('QUARTERLY', 'HALF_YEARLY', 'ANNUAL');

-- AlterTable: Employee - add new fields
ALTER TABLE "Employee"
  ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  ADD COLUMN "probationEndDate" TIMESTAMP(3),
  ADD COLUMN "contractEndDate" TIMESTAMP(3),
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "ifscCode" TEXT,
  ADD COLUMN "panNumber" TEXT,
  ADD COLUMN "profileImageUrl" TEXT;

-- AlterTable: Payroll - add status, basicSalary, paidDate, processedById
ALTER TABLE "Payroll"
  ADD COLUMN "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "paidDate" TIMESTAMP(3),
  ADD COLUMN "processedById" TEXT;

-- CreateIndex: Payroll additional index
CREATE INDEX "Payroll_employeeId_createdAt_idx" ON "Payroll"("employeeId", "createdAt");

-- AddForeignKey: Payroll processedById -> User
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Leave - add approval/rejection tracking and half-day support
ALTER TABLE "Leave"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "approvalDate" TIMESTAMP(3),
  ADD COLUMN "rejectionDate" TIMESTAMP(3),
  ADD COLUMN "halfDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "halfDayPeriod" TEXT;

-- CreateIndex: Leave composite index
CREATE INDEX "Leave_status_startDate_idx" ON "Leave"("status", "startDate");

-- AlterTable: Performance - add status, reviewPeriod, reviewDate
ALTER TABLE "Performance"
  ADD COLUMN "status" "PerformanceStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "reviewPeriod" "PerformanceReviewPeriod" NOT NULL DEFAULT 'ANNUAL',
  ADD COLUMN "reviewDate" TIMESTAMP(3);

-- CreateIndex: Performance
CREATE INDEX "Performance_employeeId_idx" ON "Performance"("employeeId");

-- AlterTable: Notification - add readAt
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex: Notification composite index
CREATE INDEX "Notification_employeeId_readStatus_idx" ON "Notification"("employeeId", "readStatus");

-- CreateTable: HolidayCalendar
CREATE TABLE "HolidayCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC',
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: HolidayCalendar
CREATE INDEX "HolidayCalendar_year_idx" ON "HolidayCalendar"("year");
CREATE INDEX "HolidayCalendar_date_idx" ON "HolidayCalendar"("date");
