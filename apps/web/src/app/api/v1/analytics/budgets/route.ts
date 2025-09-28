import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { BudgetAnalyticsQuerySchema, BudgetAnalyticsResponseSchema } from '@/lib/validation/analytics';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[analytics/budgets] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

function resolveRange(params: { month?: string; from?: string; to?: string }) {
  if (params.month) {
    const [yearStr, monthStr] = params.month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
      throw new ApiError(400, '4007', 'Invalid month format.');
    }

    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
    end.setUTCMilliseconds(-1);
    return { rangeStart: start, rangeEnd: end };
  }

  if (params.from && params.to) {
    const start = new Date(params.from);
    const end = new Date(params.to);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ApiError(400, '4007', 'Invalid date range.');
    }

    if (start.getTime() > end.getTime()) {
      throw new ApiError(400, '4007', 'from must be before to.');
    }

    return { rangeStart: start, rangeEnd: end };
  }

  throw new ApiError(400, '4007', 'Provide either month or from/to range.');
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);

    const parsedQuery = BudgetAnalyticsQuerySchema.safeParse({
      month: url.searchParams.get('month') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined
    });

    if (!parsedQuery.success) {
      throw new ApiError(400, '4007', 'Invalid analytics query parameters.', parsedQuery.error.flatten());
    }

    const { rangeStart, rangeEnd } = resolveRange(parsedQuery.data);

    const [budgets, expenses] = await Promise.all([
      prisma.budget.findMany({
        where: {
          userId: user.id,
          startDate: { lte: rangeEnd },
          OR: [{ endDate: null }, { endDate: { gte: rangeStart } }]
        },
        select: {
          id: true,
          amount: true,
          period: true,
          startDate: true,
          endDate: true,
          categoryId: true,
          category: { select: { name: true } }
        }
      }),
      prisma.expense.findMany({
        where: {
          userId: user.id,
          date: {
            gte: rangeStart,
            lte: rangeEnd
          }
        },
        select: {
          amount: true,
          categoryId: true,
          date: true
        }
      })
    ]);

    type ExpenseEntry = {
      amount: number;
      date: Date;
    };

    const allExpenses: ExpenseEntry[] = [];
    const expensesByCategory = new Map<string | null, ExpenseEntry[]>();

    for (const expense of expenses) {
      const amount = expense.amount.toNumber();
      const entry: ExpenseEntry = { amount, date: expense.date };
      const key = expense.categoryId ?? null;
      allExpenses.push(entry);

      const list = expensesByCategory.get(key);
      if (list) {
        list.push(entry);
      } else {
        expensesByCategory.set(key, [entry]);
      }
    }

    const results = budgets.map((budget) => {
      const limit = budget.amount.toNumber();
      const categoryName = budget.categoryId
        ? budget.category?.name ?? 'Unknown category'
        : 'All categories';

      const effectiveStart = budget.startDate.getTime() > rangeStart.getTime()
        ? budget.startDate
        : rangeStart;

      const effectiveEnd = budget.endDate && budget.endDate.getTime() < rangeEnd.getTime()
        ? budget.endDate
        : rangeEnd;

      let spent = 0;

      if (effectiveEnd.getTime() >= effectiveStart.getTime()) {
        const relevantExpenses = budget.categoryId
          ? expensesByCategory.get(budget.categoryId) ?? []
          : allExpenses;

        for (const expense of relevantExpenses) {
          const expenseDate = expense.date;
          if (expenseDate.getTime() < effectiveStart.getTime()) continue;
          if (expenseDate.getTime() > effectiveEnd.getTime()) continue;
          spent += expense.amount;
        }
      }

      const remaining = limit - spent;
      const progress = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        budgetId: budget.id,
        categoryName,
        limit,
        spent,
        remaining,
        progress
      };
    });

    const payload = BudgetAnalyticsResponseSchema.parse(results);

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}
