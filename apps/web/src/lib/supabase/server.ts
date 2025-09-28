import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from './types';

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
};

type CookieMethods = {
  get: (name: string) => string | undefined;
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function resolveCookieStore(): CookieStore {
  return cookies() as unknown as CookieStore;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

function createMutableCookieMethods(): CookieMethods {
  return {
    get(name) {
      return resolveCookieStore().get(name)?.value;
    },
    getAll() {
      return resolveCookieStore()
        .getAll()
        .map((cookie) => ({ name: cookie.name, value: cookie.value }));
    },
    set(name, value, options) {
      resolveCookieStore().set({ name, value, ...(options ?? {}) });
    },
    remove(name, options) {
      resolveCookieStore().delete({ name, ...(options ?? {}) });
    }
  };
}

function createReadOnlyCookieMethods(): CookieMethods {
  return {
    get(name) {
      return resolveCookieStore().get(name)?.value;
    },
    getAll() {
      return resolveCookieStore()
        .getAll()
        .map((cookie) => ({ name: cookie.name, value: cookie.value }));
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
    cookies: createMutableCookieMethods()
  });
}

export function createSupabaseServerComponentClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createReadOnlyCookieMethods()
  });
}
