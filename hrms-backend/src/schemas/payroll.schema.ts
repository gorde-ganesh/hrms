import { z } from 'zod';

export const GeneratePayrollSchema = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  workingDays: z.number().int().min(1).max(31).optional(),
  lopDaysOverride: z.number().int().min(0).optional(), // manual override when attendance records are incomplete
});

export const GenerateBatchPayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  employeeIds: z.array(z.string().min(1)).optional(), // if omitted, runs for all active employees
});
