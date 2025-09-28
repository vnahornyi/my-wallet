import { z } from 'zod';

import { ErrorResponseSchema } from '@/lib/validation/common';

export const CategoryPayloadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  icon: z.string().trim().max(50).optional()
});

export const CategoryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  isGlobal: z.boolean()
});

export const CategoryListResponseSchema = z.object({
  categories: z.array(CategoryResponseSchema)
});

export const CategoryMutationResponseSchema = z.object({
  category: CategoryResponseSchema
});

export const CategoryDeleteResponseSchema = z.object({
  success: z.literal(true)
});

export const CategoryErrorResponseSchema = ErrorResponseSchema;
