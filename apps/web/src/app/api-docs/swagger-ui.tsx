'use client';

import Script from 'next/script';
import { useCallback, useEffect } from 'react';

type SwaggerUIBundleOptions = {
  url: string;
  dom_id: string;
  deepLinking: boolean;
  layout: string;
  presets?: unknown[];
};

type SwaggerUIBundleFn = ((options: SwaggerUIBundleOptions) => unknown) & {
  presets?: {
    apis?: unknown;
  };
};

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIBundleFn;
  }
}

export default function SwaggerUI() {
  useEffect(() => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(stylesheet);

    return () => {
      document.head.removeChild(stylesheet);
    };
  }, []);

  const handleScriptReady = useCallback(() => {
    const swaggerGlobal = window.SwaggerUIBundle;

    if (!swaggerGlobal) {
      return;
    }

    const options: SwaggerUIBundleOptions = {
      url: '/api/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      layout: 'BaseLayout'
    };

    if (swaggerGlobal.presets?.apis) {
      options.presets = [swaggerGlobal.presets.apis];
    }

    swaggerGlobal(options);
  }, []);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="lazyOnload"
        onReady={handleScriptReady}
      />
      <div id="swagger-ui" className="min-h-screen" />
    </>
  );
}
