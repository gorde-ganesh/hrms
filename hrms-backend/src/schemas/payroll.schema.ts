import { z } from 'zod/v4';

// Generate payroll: no components from client — backend derives them from PayrollComponentType
export const GeneratePayrollSchema = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  lopDays: z.number().int().min(0).max(31).optional().default(0),
});

export const UpdatePayrollStatusSchema = z.object({
  status: z.enum(['APPROVED', 'LOCKED', 'PAID']),
});
