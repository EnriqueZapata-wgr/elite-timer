/**
 * Logger — helper para logging seguro en producción.
 * Solo loguea en __DEV__. En producción captura a Sentry como breadcrumb.
 */
import * as Sentry from '@sentry/react-native';

export const log = (...args: any[]) => {
  if (__DEV__) console.log(...args);
};

export const warn = (...args: any[]) => {
  if (__DEV__) console.warn(...args);
  try {
    Sentry.addBreadcrumb({
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
      level: 'warning',
    });
  } catch {}
};

export const error = (...args: any[]) => {
  if (__DEV__) console.error(...args);
  try {
    const err = args.find(a => a instanceof Error) ?? new Error(args.join(' '));
    Sentry.captureException(err);
  } catch {}
};
