import { z } from "zod";

import { ErrorResponseSchema } from "@/lib/validation/common";

export const AnalyticsSummaryQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.month) {
        return !data.from && !data.to;
      }
      return true;
    },
    {
      message: "Provide either month or from/to range, not both.",
      path: ["month"],
    }
  )
  .refine(
    (data) => {
      if (data.from && !data.to) return false;
      if (!data.from && data.to) return false;
      return true;
    },
    {
      message: "Both from and to must be provided together.",
      path: ["from"],
    }
  );

export const AnalyticsSummaryResponseSchema = z.object({
  total: z.number(),
  byCategory: z.array(
    z.object({
      categoryId: z.uuid().nullable(),
      categoryName: z.string().nullable(),
      amount: z.number(),
    })
  ),
  daily: z.array(
    z.object({
      date: z.string(),
      amount: z.number(),
    })
  ),
});

export const AnalyticsErrorResponseSchema = ErrorResponseSchema;

export const BudgetAnalyticsQuerySchema = AnalyticsSummaryQuerySchema.refine(
  (data) => {
    if (data.month) return true;
    if (data.from && data.to) return true;
    return false;
  },
  {
    message: 'Provide either month or from/to range.',
    path: ['month'],
  }
);

export const BudgetAnalyticsItemSchema = z.object({
  budgetId: z.string().uuid(),
  categoryName: z.string(),
  limit: z.number(),
  spent: z.number(),
  remaining: z.number(),
  progress: z.number(),
});

export const BudgetAnalyticsResponseSchema = z.array(BudgetAnalyticsItemSchema);
