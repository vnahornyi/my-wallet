import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import {
  CategoryDeleteResponseSchema,
  CategoryMutationResponseSchema,
  CategoryPayloadSchema
} from '@/lib/validation/categories';

function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  console.error('[categories/:id] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const { id } = params;

    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing || existing.userId !== user.id) {
      throw new ApiError(404, '4042', 'Category not found or not owned by user.');
    }

    const body = await request.json().catch(() => undefined);
    const parsedBody = CategoryPayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new ApiError(400, '4004', 'Invalid category payload.', parsedBody.error.flatten());
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsedBody.data.name,
        color: parsedBody.data.color ?? null,
        icon: parsedBody.data.icon ?? null
      }
    });

    const payload = CategoryMutationResponseSchema.parse({
      category: {
        id: updated.id,
        name: updated.name,
        color: updated.color ?? null,
        icon: updated.icon ?? null,
        isGlobal: updated.userId === null
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

    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing || existing.userId !== user.id) {
      throw new ApiError(404, '4042', 'Category not found or not owned by user.');
    }

    const expensesUsingCategory = await prisma.expense.count({
      where: { categoryId: id, userId: user.id }
    });

    if (expensesUsingCategory > 0) {
      throw new ApiError(409, '4091', 'Cannot delete category that is used by expenses.', {
        expensesUsingCategory
      });
    }

    await prisma.category.delete({ where: { id } });

    const payload = CategoryDeleteResponseSchema.parse({ success: true });

    return jsonSuccess(payload);
  } catch (error) {
    return handleError(error);
  }
}
