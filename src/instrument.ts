import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string;
const userDisabled = localStorage.getItem('lootbound-sentry-enabled') === 'false';

Sentry.init({
  dsn,
  environment: (import.meta.env.VITE_SENTRY_ENV as string) || 'development',
  enabled: !!dsn && !userDisabled,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
});
