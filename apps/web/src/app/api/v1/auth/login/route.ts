import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { ErrorResponseSchema, LoginRequestSchema, LoginResponseSchema } from '@/lib/validation/auth';

const DEFAULT_CALLBACK_PATH = '/api/v1/auth/callback';
const ERROR_CODES = {
  INVALID_REQUEST_BODY: '4001',
  OAUTH_SIGNIN_FAILED: '5021'
} as const;

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => undefined);
  const parsedBody = LoginRequestSchema.safeParse(json);

  if (!parsedBody.success) {
    const errorPayload = ErrorResponseSchema.parse({
      status: 400,
      code: ERROR_CODES.INVALID_REQUEST_BODY,
      message: 'Request body validation failed.',
      details: parsedBody.error.flatten()
    });

    return NextResponse.json(errorPayload, { status: errorPayload.status });
  }

  const { provider, redirectTo } = parsedBody.data;

  const supabase = createSupabaseRouteHandlerClient();
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const normalizedOrigin = origin.replace(/\/$/, '');
  const callbackUrl = redirectTo ?? `${normalizedOrigin}${DEFAULT_CALLBACK_PATH}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl
    }
  });

  if (error || !data?.url) {
    const errorPayload = ErrorResponseSchema.parse({
      status: 502,
      code: ERROR_CODES.OAUTH_SIGNIN_FAILED,
      message: error?.message ?? 'Unable to initiate OAuth flow with Supabase.',
      details: error ?? null
    });

    return NextResponse.json(errorPayload, { status: errorPayload.status });
  }

  const responsePayload = LoginResponseSchema.parse({ url: data.url });
  return NextResponse.json(responsePayload);
}
