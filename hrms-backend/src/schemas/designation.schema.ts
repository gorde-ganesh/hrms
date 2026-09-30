import { z } from 'zod';

export const CreateDesignationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  classification: z.string().max(100).nullish(),
});

export const UpdateDesignationSchema = CreateDesignationSchema;
