import { NextResponse } from 'next/server';

import { ErrorResponseSchema } from '@/lib/validation/common';

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(params: {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}) {
  const payload = ErrorResponseSchema.parse(params);
  return NextResponse.json(payload, { status: params.status });
}
