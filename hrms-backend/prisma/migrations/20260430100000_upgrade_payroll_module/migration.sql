-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'LOCKED', 'PAID');

-- AlterTable: Payroll — add lifecycle columns, change netSalary to Decimal, add grossSalary and lopDays
ALTER TABLE "Payroll"
  ADD COLUMN "grossSalary"  DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lopDays"      INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN "status"       "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "approvedBy"   TEXT,
  ADD COLUMN "approvedAt"   TIMESTAMP(3),
  ADD COLUMN "lockedAt"     TIMESTAMP(3),
  ADD COLUMN "paidAt"       TIMESTAMP(3);

-- Migrate netSalary from DOUBLE PRECISION to DECIMAL
ALTER TABLE "Payroll"
  ALTER COLUMN "netSalary" TYPE DECIMAL(15,2) USING "netSalary"::DECIMAL(15,2);

-- CreateIndex: payroll by employeeId for HR list queries
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex: payroll by status
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- AlterTable: PayrollComponentType — add soft-delete column, change percent to Decimal
ALTER TABLE "PayrollComponentType"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "PayrollComponentType"
  ALTER COLUMN "percent" TYPE DECIMAL(7,4) USING "percent"::DECIMAL(7,4);

-- AlterTable: PayrollComponent — add audit snapshot columns, change amount to Decimal
ALTER TABLE "PayrollComponent"
  ADD COLUMN "snapshotName"    TEXT          NOT NULL DEFAULT '',
  ADD COLUMN "snapshotType"    "ComponentType" NOT NULL DEFAULT 'ALLOWANCE',
  ADD COLUMN "snapshotPercent" DECIMAL(7,4)  NOT NULL DEFAULT 0;

ALTER TABLE "PayrollComponent"
  ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING "amount"::DECIMAL(15,2);

-- Back-fill snapshot columns from existing PayrollComponentType records
UPDATE "PayrollComponent" pc
SET
  "snapshotName"    = pct."name",
  "snapshotType"    = pct."type",
  "snapshotPercent" = COALESCE(pct."percent", 0)
FROM "PayrollComponentType" pct
WHERE pc."componentTypeId" = pct."id";

-- Remove DEFAULT after back-fill (columns are now effectively NOT NULL with real data)
ALTER TABLE "PayrollComponent"
  ALTER COLUMN "snapshotName"    DROP DEFAULT,
  ALTER COLUMN "snapshotType"    DROP DEFAULT,
  ALTER COLUMN "snapshotPercent" DROP DEFAULT;
