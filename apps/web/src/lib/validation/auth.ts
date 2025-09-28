import { z } from 'zod';

export const AuthProviderSchema = z.enum(['google', 'apple']);

export const LoginRequestSchema = z.object({
  provider: AuthProviderSchema,
  redirectTo: z.string().url().optional()
});

export const LoginResponseSchema = z.object({
  url: z.string().url()
});

export const ErrorCodeSchema = z.string().regex(/^\d{3,4}$/);

export const ErrorResponseSchema = z.object({
  status: z.number().int().min(400).max(599),
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional()
});

export const AuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  redirect_to: z.string().url().optional()
});

export const SupabaseUserSchema = z
  .object({
    id: z.string(),
    email: z.email().nullable(),
    aud: z.string().optional(),
    created_at: z.string().optional(),
    app_metadata: z.record(z.any(), z.any()).optional(),
    user_metadata: z.record(z.any(), z.any()).optional()
  })
  .loose();

export const MeResponseSchema = z.object({
  user: SupabaseUserSchema
});
