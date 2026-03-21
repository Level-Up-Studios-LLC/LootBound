import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string;
const userDisabled = localStorage.getItem('lootbound-sentry-enabled') === 'false';

Sentry.init({
  dsn,
  environment: (import.meta.env.VITE_SENTRY_ENV as string) || 'development',
  enabled: !!dsn && !userDisabled,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});
