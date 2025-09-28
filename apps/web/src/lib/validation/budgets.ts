import { z } from 'zod';

import { ErrorResponseSchema } from '@/lib/validation/common';

export const BudgetPeriodSchema = z.enum(['weekly', 'monthly', 'custom']);

export const BudgetPayloadSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    amount: z.coerce.number().positive(),
    period: BudgetPeriodSchema,
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime().nullable().optional()
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return !!data.endDate;
      }
      return true;
    },
    {
      message: 'endDate is required when period is custom.',
      path: ['endDate']
    }
  )
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
    },
    {
      message: 'endDate must be after or equal to startDate.',
      path: ['endDate']
    }
  );

export const BudgetResponseSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  amount: z.number(),
  period: BudgetPeriodSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.string()
});

export const BudgetListResponseSchema = z.object({
  budgets: z.array(BudgetResponseSchema)
});

export const BudgetMutationResponseSchema = z.object({
  budget: BudgetResponseSchema
});

export const BudgetDeleteResponseSchema = z.object({
  success: z.literal(true)
});

export const BudgetErrorResponseSchema = ErrorResponseSchema;
