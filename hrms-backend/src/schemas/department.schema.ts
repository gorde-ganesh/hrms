import { z } from 'zod';

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema;
