import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { AnalyticsSummaryQuerySchema, AnalyticsSummaryResponseSchema } from '@/lib/validation/analytics';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[analytics/summary] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);

    const parsedQuery = AnalyticsSummaryQuerySchema.safeParse({
      month: url.searchParams.get('month') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined
    });

    if (!parsedQuery.success) {
      throw new ApiError(400, '4005', 'Invalid analytics query parameters.', parsedQuery.error.flatten());
    }

    const { month, from, to } = parsedQuery.data;

    let rangeStart: Date | undefined;
    let rangeEnd: Date | undefined;

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
        throw new ApiError(400, '4005', 'Invalid month format.');
      }
      rangeStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      rangeEnd = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
      rangeEnd.setUTCMilliseconds(-1);
    } else if (from && to) {
      rangeStart = new Date(from);
      rangeEnd = new Date(to);
    } else if (from || to) {
      throw new ApiError(400, '4005', 'Both from and to must be provided together.');
    } else {
      rangeEnd = new Date();
      rangeStart = new Date(rangeEnd);
      rangeStart.setUTCDate(rangeEnd.getUTCDate() - 29);
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(rangeStart && rangeEnd
          ? { date: { gte: rangeStart, lte: rangeEnd } }
          : rangeStart
            ? { date: { gte: rangeStart } }
            : rangeEnd
              ? { date: { lte: rangeEnd } }
              : {})
      },
      select: {
        amount: true,
        categoryId: true,
        date: true
      }
    });

    let total = 0;
    const byCategoryMap = new Map<string | null, number>();
    const dailyMap = new Map<string, number>();

    for (const expense of expenses) {
      const amount = expense.amount.toNumber();
      total += amount;

      const categoryKey = expense.categoryId ?? null;
      byCategoryMap.set(categoryKey, (byCategoryMap.get(categoryKey) ?? 0) + amount);

      const dayKey = toDateKey(expense.date);
      dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + amount);
    }

    const categoryIds = Array.from(byCategoryMap.keys()).filter((id): id is string => id !== null);

    const categories = categoryIds.length
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true }
        })
      : [];

    const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));

    const byCategory = Array.from(byCategoryMap.entries()).map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categoryId ? categoryNameMap.get(categoryId) ?? null : null,
      amount
    }));

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([dateKey, amount]) => ({ date: dateKey, amount }));

    const payload = AnalyticsSummaryResponseSchema.parse({
      total,
      byCategory,
      daily
    });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}
