import { z } from 'zod';
import type { UserFormData } from '@/types/user';
import { LoginData } from '@/types/auth';

// Base user validation schemas
export const userFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
    role: z.string().min(1, 'Please select a role'),
    branch: z.string().min(1, 'Please select a branch'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }) satisfies z.ZodType<UserFormData>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
}) satisfies z.ZodType<LoginData>;
