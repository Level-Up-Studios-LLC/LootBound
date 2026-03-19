import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string;

Sentry.init({
  dsn,
  environment: (import.meta.env.VITE_SENTRY_ENV as string) || 'development',
  enabled: !!dsn,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});
