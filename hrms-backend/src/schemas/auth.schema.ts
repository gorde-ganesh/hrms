import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  });

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ChangePasswordSchema = z.object({
  newPassword: passwordSchema,
  token: z.string().optional(),
  userId: z.string().optional(),
  oldPassword: z.string().optional(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
