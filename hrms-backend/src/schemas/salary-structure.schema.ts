import { z } from 'zod';

export const CreateSalaryStructureSchema = z.object({
  employeeId: z.string().min(1),
  ctcAnnual: z.number().positive(),
  basicPct: z.number().min(1).max(100),   // basic as % of gross monthly
  hraPct: z.number().min(0).max(100),     // HRA as % of basic
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be YYYY-MM-DD'),
});

export const UpdateSalaryStructureSchema = z.object({
  ctcAnnual: z.number().positive().optional(),
  basicPct: z.number().min(1).max(100).optional(),
  hraPct: z.number().min(0).max(100).optional(),
});
