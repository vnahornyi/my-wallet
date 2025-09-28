'use server'

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

import { ApiError } from '@/lib/http/errors';
import { prisma } from '@/lib/prisma';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase service role configuration is missing.');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

export async function requireUser(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    throw new ApiError(401, '4011', 'Missing or invalid authorization header.');
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw new ApiError(401, '4012', 'Bearer token is empty.');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiError(401, '4013', 'Unable to verify access token.', error);
  }

  const supabaseUser = data.user;

  if (!supabaseUser.email) {
    throw new ApiError(403, '4031', 'User email is required for this operation.');
  }

  const nameFromMetadata = (() => {
    const metadata = supabaseUser.user_metadata ?? {};
    if (typeof metadata.full_name === 'string') return metadata.full_name;
    if (typeof metadata.name === 'string') return metadata.name;
    return null;
  })();

  const dbUser = await prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email: supabaseUser.email,
      name: nameFromMetadata
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: nameFromMetadata
    }
  });

  return dbUser;
}
