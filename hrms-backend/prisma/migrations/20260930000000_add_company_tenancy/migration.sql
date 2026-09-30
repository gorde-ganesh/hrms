-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('OLD', 'NEW');

-- CreateEnum
CREATE TYPE "StatutoryComponentType" AS ENUM ('BASIC', 'HRA', 'SPECIAL_ALLOWANCE', 'CONVEYANCE', 'MEDICAL', 'PF_EMPLOYEE', 'PF_EMPLOYER', 'ESI_EMPLOYEE', 'ESI_EMPLOYER', 'TDS', 'PROFESSIONAL_TAX', 'LOP', 'BONUS', 'GRATUITY', 'ADVANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('INVITED', 'PROFILE_PENDING', 'DOCUMENTS_PENDING', 'IT_SETUP_PENDING', 'COMPLETED');

-- DropIndex
DROP INDEX "Department_name_key";

-- DropIndex
DROP INDEX "Designation_name_key";

-- DropIndex
DROP INDEX "PayrollComponentType_name_key";

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "attendanceDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Designation" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "esiNumber" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "pfNumber" TEXT,
ADD COLUMN     "pfOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "professionalTaxState" TEXT,
ADD COLUMN     "taxRegime" "TaxRegime" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "uan" TEXT,
ALTER COLUMN "salary" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "HolidayCalendar" ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "grossSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "lopDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workingDays" INTEGER NOT NULL DEFAULT 26,
ALTER COLUMN "netSalary" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "basicSalary" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "PayrollComponent" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "PayrollComponentType" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "statutoryType" "StatutoryComponentType",
ALTER COLUMN "percent" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "gender" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "cin" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "ctcAnnual" DECIMAL(12,2) NOT NULL,
    "basicPct" DECIMAL(5,2) NOT NULL,
    "hraPct" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransferBatch" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "BankTransferBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransferItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "BankTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "carryForwardDays" INTEGER NOT NULL DEFAULT 0,
    "requiresCertificate" BOOLEAN NOT NULL DEFAULT false,
    "minNoticeDays" INTEGER NOT NULL DEFAULT 0,
    "genderRestriction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryStructure_employeeId_effectiveFrom_idx" ON "SalaryStructure"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollId_key" ON "Payslip"("payrollId");

-- CreateIndex
CREATE INDEX "Payslip_payrollId_idx" ON "Payslip"("payrollId");

-- CreateIndex
CREATE INDEX "BankTransferBatch_companyId_year_month_idx" ON "BankTransferBatch"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransferItem_payrollId_key" ON "BankTransferItem"("payrollId");

-- CreateIndex
CREATE INDEX "BankTransferItem_batchId_idx" ON "BankTransferItem"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_leaveType_key" ON "LeavePolicy"("leaveType");

-- CreateIndex
CREATE INDEX "OnboardingTask_employeeId_idx" ON "OnboardingTask"("employeeId");

-- CreateIndex
CREATE INDEX "OnboardingTask_employeeId_completed_idx" ON "OnboardingTask"("employeeId", "completed");

-- CreateIndex
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId", "name");

-- CreateIndex
CREATE INDEX "Designation_companyId_idx" ON "Designation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_companyId_name_key" ON "Designation"("companyId", "name");

-- CreateIndex
CREATE INDEX "HolidayCalendar_companyId_year_idx" ON "HolidayCalendar"("companyId", "year");

-- CreateIndex
CREATE INDEX "Payroll_idempotencyKey_idx" ON "Payroll"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayrollComponentType_companyId_idx" ON "PayrollComponentType"("companyId");

-- CreateIndex
CREATE INDEX "PayrollComponentType_statutoryType_idx" ON "PayrollComponentType"("statutoryType");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollComponentType_companyId_name_key" ON "PayrollComponentType"("companyId", "name");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollComponentType" ADD CONSTRAINT "PayrollComponentType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferBatch" ADD CONSTRAINT "BankTransferBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferItem" ADD CONSTRAINT "BankTransferItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BankTransferBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferItem" ADD CONSTRAINT "BankTransferItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

