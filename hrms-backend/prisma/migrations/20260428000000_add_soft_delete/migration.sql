-- Add soft delete (deletedAt) to User, Employee, Department, Designation
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Department" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Designation" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes to speed up the common "where deletedAt IS NULL" filter
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");
CREATE INDEX "Department_deletedAt_idx" ON "Department"("deletedAt");
CREATE INDEX "Designation_deletedAt_idx" ON "Designation"("deletedAt");
