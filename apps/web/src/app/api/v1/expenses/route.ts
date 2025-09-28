import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import {
  ExpenseListResponseSchema,
  ExpenseMutationResponseSchema,
  ExpensePayloadSchema,
  ExpenseQuerySchema
} from '@/lib/validation/expenses';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[expenses] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const queryParse = ExpenseQuerySchema.safeParse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      categoryId: url.searchParams.get('categoryId') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      offset: url.searchParams.get('offset') ?? undefined
    });

    if (!queryParse.success) {
      throw new ApiError(400, '4002', 'Invalid query parameters.', queryParse.error.flatten());
    }

    const { from, to, categoryId, limit, offset } = queryParse.data;

    const where: Prisma.ExpenseWhereInput = {
      userId: user.id
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to)
      };
    } else if (from) {
      where.date = {
        gte: new Date(from)
      };
    } else if (to) {
      where.date = {
        lte: new Date(to)
      };
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          amount: true,
          categoryId: true,
          note: true,
          date: true,
          createdAt: true
        }
      }),
      prisma.expense.count({ where })
    ]);

    const data = items.map((expense) => ({
      id: expense.id,
      amount: expense.amount.toNumber(),
      categoryId: expense.categoryId,
      note: expense.note ?? null,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString()
    }));

    const payload = ExpenseListResponseSchema.parse({
      data,
      pagination: { limit, offset, total }
    });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
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

    const created = await prisma.expense.create({
      data: {
        userId: user.id,
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
        id: created.id,
        amount: created.amount.toNumber(),
        categoryId: created.categoryId,
        note: created.note ?? null,
        date: created.date.toISOString(),
        createdAt: created.createdAt.toISOString()
      }
    });

    return jsonSuccess(payload, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
