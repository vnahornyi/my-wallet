import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { AuthCallbackQuerySchema } from '@/lib/validation/auth';

const DEFAULT_REDIRECT_PATH = '/';
const ERROR_CODES = {
  INVALID_CALLBACK_PARAMS: '4002',
  SESSION_EXCHANGE_FAILED: '5022'
} as const;

export async function GET(request: NextRequest) {
  const supabase = createSupabaseRouteHandlerClient();
  const { searchParams } = new URL(request.url);
  const parsedQuery = AuthCallbackQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_REDIRECT_PATH;
  const normalizedOrigin = origin.replace(/\/$/, '');

  if (!parsedQuery.success) {
    const redirectTo = `${normalizedOrigin}${DEFAULT_REDIRECT_PATH}?error_code=${ERROR_CODES.INVALID_CALLBACK_PARAMS}`;
    return NextResponse.redirect(redirectTo);
  }

  const { code, redirect_to: redirectToFromQuery } = parsedQuery.data;
  const redirectTo = redirectToFromQuery ?? `${normalizedOrigin}${DEFAULT_REDIRECT_PATH}`;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorQuery = new URLSearchParams({
        error_code: ERROR_CODES.SESSION_EXCHANGE_FAILED,
        error_message: error.message
      });
      return NextResponse.redirect(`${redirectTo}?${errorQuery.toString()}`);
    }
  }

  return NextResponse.redirect(redirectTo);
}
