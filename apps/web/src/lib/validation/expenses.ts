import { z } from 'zod';

import { ErrorResponseSchema } from '@/lib/validation/common';

export const ExpenseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const ExpensePayloadSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.uuid().nullable().optional(),
  note: z.string().trim().max(500).optional(),
  date: z.iso.datetime({ offset: true }).or(z.iso.datetime())
});

export const ExpenseResponseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  categoryId: z.string().uuid().nullable(),
  note: z.string().nullable(),
  date: z.string(),
  createdAt: z.string()
});

export const ExpenseListResponseSchema = z.object({
  data: z.array(ExpenseResponseSchema),
  pagination: z.object({
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int()
  })
});

export const ExpenseMutationResponseSchema = z.object({
  expense: ExpenseResponseSchema
});

export const ExpenseDeleteResponseSchema = z.object({
  success: z.literal(true)
});

export const ExpenseErrorResponseSchema = ErrorResponseSchema;
