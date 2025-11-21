/*
  Warnings:

  - You are about to drop the column `percent` on the `PayrollComponent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PayrollComponent" DROP COLUMN "percent";

-- AlterTable
ALTER TABLE "public"."PayrollComponentType" ADD COLUMN     "percent" DOUBLE PRECISION;
