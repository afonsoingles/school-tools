import {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/api/notifications"

export class PushServerError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "PushServerError"
  }
}

export class PushUnsupportedError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "PushUnsupportedError"
  }
}

export class PushInvalidKeyError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "PushInvalidKeyError"
  }
}

export class PushRegistrationError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "PushRegistrationError"
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function isWebKitOnlyUserAgent(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return /AppleWebKit/i.test(ua) && !/Chrome|CriOS|Edg|Edge|OPR|SamsungBrowser/i.test(ua)
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent

  let os = "Unknown OS"
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS"
  else if (/Windows/i.test(ua)) os = "Windows"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/Linux/i.test(ua)) os = "Linux"

  let browser = "Browser"
  if (/Edg(e)?\//i.test(ua)) browser = "Edge"
  else if (/OPR|Opera/i.test(ua)) browser = "Opera"
  else if (/Brave/i.test(ua)) browser = "Brave"
  else if (/CriOS/i.test(ua)) browser = "Chrome"
  else if (/Chrome/i.test(ua)) browser = "Chrome"
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet"
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox"
  else if (isWebKitOnlyUserAgent()) browser = "Safari"

  return `${browser} · ${os}`
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

async function validateP256PublicKey(key: Uint8Array<ArrayBuffer>): Promise<boolean> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return true
  try {
    await subtle.importKey("raw", key as BufferSource, { name: "ECDH", namedCurve: "P-256" }, true, [])
    return true
  } catch {
    return false
  }
}

async function getVapidApplicationServerKey(): Promise<Uint8Array<ArrayBuffer>> {
  const publicKey = await getVapidPublicKey()
  const applicationServerKey = urlBase64ToUint8Array(publicKey)
  const hasValidFormat =
    applicationServerKey.length === 65 && applicationServerKey[0] === 0x04
  if (!hasValidFormat || !(await validateP256PublicKey(applicationServerKey))) {
    throw new PushInvalidKeyError(
      `Invalid VAPID public key provided by the server (${applicationServerKey.length} bytes)`
    )
  }
  return applicationServerKey
}

const SW_URL = "/sw.js"
const SW_SCOPE = "/"

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function isActivated(registration: ServiceWorkerRegistration): boolean {
  return registration.active?.state === "activated"
}

async function registerActivatedServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  if (isActivated(registration)) return registration

  const worker = registration.installing || registration.waiting || registration.active
  if (!worker) return registration
  if (worker.state === "activated") return registration

  await new Promise<void>((resolve) => {
    const onChange = () => {
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", onChange)
        resolve()
      }
    }
    worker.addEventListener("statechange", onChange)
  })
  return registration
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE)
  if (existing && isActivated(existing)) return existing
  return registerActivatedServiceWorker()
}

async function resetPushState(): Promise<void> {
  for (const registration of await navigator.serviceWorker.getRegistrations()) {
    const subscription = await registration.pushManager.getSubscription().catch(() => null)
    if (subscription) {
      await subscription.unsubscribe().catch(() => {})
    }
    await registration.unregister().catch(() => {})
  }
  // Wait until every registration is actually gone so a dying registration
  // can't be re-picked by getRegistration()/ready and fail the next subscribe.
  for (let i = 0; i < 20; i++) {
    const remaining = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    if (!remaining) return
    await remaining.unregister().catch(() => {})
    await delay(50)
  }
}

function sameApplicationServerKey(
  key: Uint8Array<ArrayBuffer>,
  compareTo: ArrayBuffer
): boolean {
  if (key.length !== compareTo.byteLength) return false
  const other = new Uint8Array(compareTo)
  return key.every((byte, index) => byte === other[index])
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array<ArrayBuffer>
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    const existingKey = existing.options.applicationServerKey
    if (existingKey == null || sameApplicationServerKey(applicationServerKey, existingKey)) {
      return existing
    }
    // The push provider aborts a new subscribe ("Registration failed - push
    // service error") while an old subscription with a different application
    // server key is still active. Unsubscribe it first, then re-subscribe.
    await existing.unsubscribe()
  }
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
}

function isRegistrationAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    err.name === "AbortError" &&
    /registration/i.test(err.message)
  )
}

async function persistSubscription(subscription: PushSubscription): Promise<string> {
  try {
    await subscribeToPush(subscription, getDeviceLabel())
    return subscription.endpoint
  } catch (err) {
    console.error("Server did not accept the push subscription:", err)
    await unsubscribeFromPush(subscription.endpoint).catch(() => {})
    throw new PushServerError("The server did not accept the push subscription")
  }
}

export async function ensurePushSubscription(): Promise<string | false> {
  if (!isPushSupported()) return false

  // Safari's Web Push (and PushManager in general) requires HTTPS. On an http
  // origin Safari grants the Notification permission but rejects the
  // subscription with "Registration failed - push service error". Fail with a
  // clear, actionable error instead of attempting and hitting the AbortError.
  if (typeof window !== "undefined" && window.location.protocol === "http:" && isWebKitOnlyUserAgent()) {
    throw new PushUnsupportedError(
      "Safari requires HTTPS to register Web Push; open the app over HTTPS or use another browser"
    )
  }

  if (!window.isSecureContext) {
    throw new PushUnsupportedError(
      "Push notifications require a secure (HTTPS) connection"
    )
  }

  // Push is only available from the installed app (home-screen PWA).
  // Regular browser tabs get in-app notifications only.
  if (!isPwaStandalone()) {
    throw new PushUnsupportedError(
      "Push notifications are only available from the installed app (PWA)"
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false

  const applicationServerKey = await getVapidApplicationServerKey()

  console.info("[push] subscribing", {
    browser: isWebKitOnlyUserAgent() ? "safari-like" : "chromium/firefox",
    secureContext: window.isSecureContext,
    origin: window.location.origin,
    applicationServerKey: applicationServerKey.length,
  })

  let registration = await getReadyRegistration()
  let subscription: PushSubscription | null = null
  try {
    subscription = await createSubscription(registration, applicationServerKey)
  } catch (err) {
    // A stale or conflicting push subscription/service worker makes the push
    // provider abort the registration ("Registration failed - push service
    // error"). Clear everything and retry on a freshly activated registration.
    console.error("[push] first subscribe rejected; clearing stale state:", err)
    await resetPushState()

    for (let attempt = 1; attempt <= 2 && subscription === null; attempt++) {
      if (attempt > 1) await delay(1000)
      registration = await getReadyRegistration()
      try {
        subscription = await createSubscription(registration, applicationServerKey)
      } catch (retryErr) {
        console.error(`[push] subscribe retry ${attempt} rejected:`, retryErr)
        if (isRegistrationAbortError(retryErr)) {
          await resetPushState()
        } else {
          throw retryErr
        }
      }
    }
  }

  if (subscription === null) {
    throw new PushRegistrationError(
      "The browser's push service rejected the device registration"
    )
  }

  return persistSubscription(subscription)
}

export function pushEndpointHost(endpoint: string, fallback: string): string {
  try {
    return new URL(endpoint).host
  } catch {
    return fallback
  }
}

export async function getCurrentPushEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null
  try {
    const subscription = await getActivePushSubscription()
    return subscription?.endpoint ?? null
  } catch {
    return null
  }
}

async function getActivePushSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return

  const subscription = await getActivePushSubscription()
  if (!subscription) return

  await unsubscribeFromPush(subscription.endpoint).catch(() => {})
  await subscription.unsubscribe()
}