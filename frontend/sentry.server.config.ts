// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent, TransactionEvent } from "@sentry/core";

const STRIPPED_COOKIE = "school_tools_session";

function stripCookie(cookie: string): string {
  return cookie.replace(
    new RegExp(`(^|;\\s*)${STRIPPED_COOKIE}\\s*=\\s*[^;]*`, "g"),
    `$1${STRIPPED_COOKIE}=[REDACTED]`
  );
}

function stripSessionCookie(event: ErrorEvent | TransactionEvent) {
  const headers = event.request?.headers;
  if (headers && headers.Cookie) {
    headers.Cookie = stripCookie(headers.Cookie);
  }
  return event;
}

function stripErrorSessionCookie(event: ErrorEvent): ErrorEvent {
  return stripSessionCookie(event) as ErrorEvent;
}

function stripTransactionSessionCookie(event: TransactionEvent): TransactionEvent {
  return stripSessionCookie(event) as TransactionEvent;
}

// Next.js reports route-handler request errors to Sentry labelled with the route
// template (e.g. "POST /api/[[...path]]") instead of the concrete request path.
// The SDK exposes the real path in contexts.nextjs.request_path — surface it as the title.
function setConcreteRequestPath(event: ErrorEvent): ErrorEvent {
  const requestPath = (event.contexts?.nextjs as { request_path?: string } | undefined)?.request_path;
  if (!requestPath) return event;
  const method = event.transaction?.split(" ")[0] ?? "REQUEST";
  event.transaction = `${method} ${requestPath}`;
  return event;
}

Sentry.init({
  dsn: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_SENTRY_DSN : undefined,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  beforeSend: (event) => setConcreteRequestPath(stripErrorSessionCookie(event)),
  beforeSendTransaction: stripTransactionSessionCookie,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
