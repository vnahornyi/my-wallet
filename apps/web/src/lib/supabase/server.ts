import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from './types';

type CookieOptions = Record<string, unknown>;

type SupabaseCookies = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

async function buildRouteCookies(): Promise<SupabaseCookies> {
  const cookieStore = await cookies();

  return {
    get(name) {
      return cookieStore.get(name)?.value;
    },
    set(name, value, options) {
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove(name, options) {
      cookieStore.set({ name, value: '', ...(options ?? {}), maxAge: 0 });
    }
  };
}

async function buildReadOnlyCookies(): Promise<SupabaseCookies> {
  const cookieStore = await cookies();

  return {
    get(name) {
      return cookieStore.get(name)?.value;
    },
    set() {
      throw new Error('Cannot set cookies in a read-only context.');
    },
    remove() {
      throw new Error('Cannot remove cookies in a read-only context.');
    }
  };
}

export function createSupabaseRouteHandlerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: buildRouteCookies()
  });
}

export function createSupabaseServerComponentClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: buildReadOnlyCookies()
  });
}
