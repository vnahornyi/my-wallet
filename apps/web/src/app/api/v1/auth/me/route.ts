import { NextResponse } from 'next/server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { ErrorResponseSchema, MeResponseSchema } from '@/lib/validation/auth';

const ERROR_CODES = {
  USER_LOOKUP_FAILED: '5021',
  UNAUTHENTICATED: '4011'
} as const;

export async function GET() {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    const payload = ErrorResponseSchema.parse({
      status: 502,
      code: ERROR_CODES.USER_LOOKUP_FAILED,
      message: error.message,
      details: error
    });

    return NextResponse.json(payload, { status: payload.status });
  }

  if (!user) {
    const payload = ErrorResponseSchema.parse({
      status: 401,
      code: ERROR_CODES.UNAUTHENTICATED,
      message: 'Session is missing or invalid.'
    });

    return NextResponse.json(payload, { status: payload.status });
  }

  const sanitizedUser = {
    ...user,
    email: user.email ?? null
  };

  const responsePayload = MeResponseSchema.parse({ user: sanitizedUser });
  return NextResponse.json(responsePayload);
}
