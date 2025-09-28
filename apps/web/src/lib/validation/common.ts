import { z } from 'zod';

export const ErrorCodeSchema = z.string().regex(/^\d{3,4}$/);

export const ErrorResponseSchema = z.object({
  status: z.number().int().min(400).max(599),
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
