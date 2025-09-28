import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { ExpenseDeleteResponseSchema, ExpenseMutationResponseSchema, ExpensePayloadSchema } from '@/lib/validation/expenses';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[expenses/:id] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const { id } = params;

    const existing = await prisma.expense.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existing) {
      throw new ApiError(404, '4040', 'Expense not found.');
    }

    const body = await request.json().catch(() => undefined);
    const parsedBody = ExpensePayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new ApiError(400, '4003', 'Invalid expense payload.', parsedBody.error.flatten());
    }

    const { amount, categoryId: rawCategoryId, note, date } = parsedBody.data;

    let categoryId: string | null | undefined = rawCategoryId ?? null;

    if (rawCategoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: rawCategoryId,
          OR: [{ userId: user.id }, { userId: null }]
        }
      });

      if (!category) {
        throw new ApiError(404, '4041', 'Category not found for this user.');
      }

      categoryId = category.id;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        categoryId,
        amount: new Prisma.Decimal(amount),
        note: note ?? null,
        date: new Date(date)
      },
      select: {
        id: true,
        amount: true,
        categoryId: true,
        note: true,
        date: true,
        createdAt: true
      }
    });

    const payload = ExpenseMutationResponseSchema.parse({
      expense: {
        id: updated.id,
        amount: updated.amount.toNumber(),
        categoryId: updated.categoryId,
        note: updated.note ?? null,
        date: updated.date.toISOString(),
        createdAt: updated.createdAt.toISOString()
      }
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

    const existing = await prisma.expense.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existing) {
      throw new ApiError(404, '4040', 'Expense not found.');
    }

    await prisma.expense.delete({ where: { id } });

    const payload = ExpenseDeleteResponseSchema.parse({ success: true });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}
