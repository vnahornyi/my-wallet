import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import {
  BudgetDeleteResponseSchema,
  BudgetMutationResponseSchema,
  BudgetPayloadSchema
} from '@/lib/validation/budgets';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[budgets/:id] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

function normalizeBudgetPayload(input: unknown) {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const record = input as Record<string, unknown>;

  return {
    ...record,
    categoryId: (record.categoryId ?? record['category_id']) as unknown,
    startDate: (record.startDate ?? record['start_date']) as unknown,
    endDate: (record.endDate ?? record['end_date']) as unknown
  };
}

function formatBudget(budget: {
  id: string;
  categoryId: string | null;
  category?: { name: string | null } | null;
  amount: Prisma.Decimal;
  period: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
}) {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category?.name ?? null,
    amount: budget.amount.toNumber(),
    period: budget.period,
    startDate: budget.startDate.toISOString(),
    endDate: budget.endDate ? budget.endDate.toISOString() : null,
    createdAt: budget.createdAt.toISOString()
  };
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const { id } = params;

    const existing = await prisma.budget.findUnique({
      where: { id },
      select: { id: true, userId: true, categoryId: true }
    });

    if (!existing || existing.userId !== user.id) {
      throw new ApiError(404, '4044', 'Budget not found or not owned by user.');
    }

    const rawBody = await request.json().catch(() => undefined);
    const normalizedBody = normalizeBudgetPayload(rawBody);
    const parsedBody = BudgetPayloadSchema.safeParse(normalizedBody);

    if (!parsedBody.success) {
      throw new ApiError(400, '4006', 'Invalid budget payload.', parsedBody.error.flatten());
    }

    let categoryId: string | null = existing.categoryId;

    if (parsedBody.data.categoryId !== undefined) {
      if (parsedBody.data.categoryId === null) {
        categoryId = null;
      } else {
        const category = await prisma.category.findFirst({
          where: {
            id: parsedBody.data.categoryId,
            OR: [{ userId: user.id }, { userId: null }]
          },
          select: { id: true }
        });

        if (!category) {
          throw new ApiError(404, '4043', 'Category not found for this user.');
        }

        categoryId = category.id;
      }
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        categoryId,
        amount: new Prisma.Decimal(parsedBody.data.amount),
        period: parsedBody.data.period,
        startDate: new Date(parsedBody.data.startDate),
        endDate: parsedBody.data.endDate ? new Date(parsedBody.data.endDate) : null
      },
      select: {
        id: true,
        categoryId: true,
        amount: true,
        period: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        category: {
          select: { name: true }
        }
      }
    });

    const payload = BudgetMutationResponseSchema.parse({
      budget: formatBudget(updated)
    });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const { id } = params;

    const existing = await prisma.budget.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!existing || existing.userId !== user.id) {
      throw new ApiError(404, '4044', 'Budget not found or not owned by user.');
    }

    await prisma.budget.delete({ where: { id } });

    const payload = BudgetDeleteResponseSchema.parse({ success: true });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}
