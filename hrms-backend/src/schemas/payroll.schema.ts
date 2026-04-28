import { z } from 'zod';

export const GeneratePayrollSchema = z.object({
  employeeId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  components: z.array(
    z.object({
      componentTypeId: z.string().min(1),
      amount: z.number().nonnegative(),
    })
  ).optional(),
});
