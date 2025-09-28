import { z } from 'zod';

import { ErrorResponseSchema } from '@/lib/validation/common';

export const AuthProviderSchema = z.enum(['google', 'apple']);

export const LoginRequestSchema = z.object({
  provider: AuthProviderSchema,
  redirectTo: z.url().optional()
});

export const LoginResponseSchema = z.object({
  url: z.url()
});

export const AuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  redirect_to: z.url().optional()
});

export const SupabaseUserSchema = z
  .object({
    id: z.string(),
    email: z.email().nullable(),
    aud: z.string().optional(),
    created_at: z.string().optional(),
    app_metadata: z.record(z.string(), z.unknown()).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional()
  })
  .loose();

export const MeResponseSchema = z.object({
  user: SupabaseUserSchema
});

export { ErrorResponseSchema };
