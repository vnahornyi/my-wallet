import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/require-user';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonSuccess } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import {
  CategoryListResponseSchema,
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

  console.error('[categories] unexpected error', error);
  return jsonError({ status: 500, code: '5001', message: 'Unexpected server error.' });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }]
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        userId: true
      }
    });

    const payload = CategoryListResponseSchema.parse({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color ?? null,
        icon: category.icon ?? null,
        isGlobal: category.userId === null
      }))
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
    const parsedBody = CategoryPayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new ApiError(400, '4004', 'Invalid category payload.', parsedBody.error.flatten());
    }

    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: parsedBody.data.name,
        color: parsedBody.data.color ?? null,
        icon: parsedBody.data.icon ?? null
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        userId: true
      }
    });

    const payload = CategoryMutationResponseSchema.parse({
      category: {
        id: created.id,
        name: created.name,
        color: created.color ?? null,
        icon: created.icon ?? null,
        isGlobal: created.userId === null
      }
    });

    return jsonSuccess(payload, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
