import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SwaggerUI from './swagger-ui';

export const metadata: Metadata = {
  title: 'API Docs'
};

export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <SwaggerUI />;
}
