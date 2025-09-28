import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function resolveOpenApiPath() {
  const candidates = [
    path.join(process.cwd(), 'openapi.yaml'),
    path.join(process.cwd(), '..', 'openapi.yaml'),
    path.join(process.cwd(), '..', '..', 'openapi.yaml')
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error('OpenAPI specification file not found.');
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  const openApiPath = await resolveOpenApiPath();
  const file = await fs.readFile(openApiPath, 'utf8');

  return new NextResponse(file, {
    status: 200,
    headers: {
      'content-type': 'text/yaml; charset=utf-8'
    }
  });
}
