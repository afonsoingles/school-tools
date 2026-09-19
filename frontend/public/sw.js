const STATIC_CACHE = "school-tools-static-v1"
const RUNTIME_CACHE = "school-tools-runtime-v1"
const APP_SHELL = ["/", "/manifest.webmanifest", "/logo.png", "/apple-icon.png", "/favicon.ico"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith("school-tools-"))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isNavigation(request) {
  return request.mode === "navigate"
}

async function networkFirst(request, cacheName) {
  const url = new URL(request.url)
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok && request.method === "GET") {
      cache.put(url.href, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(url.href)
    if (cached) return cached
    const shell = await caches.match("/")
    if (shell) return shell
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
  }
}

async function cacheFirst(request, cacheName) {
  const url = new URL(request.url)
  const cache = await caches.open(cacheName)
  const hit = await cache.match(url.href)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok && request.method === "GET") {
    cache.put(url.href, response.clone())
  }
  return response
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
    return
  }

  if (url.pathname.startsWith("/api/")) {
    return
  }

  event.respondWith(cacheFirst(request, STATIC_CACHE))
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || "School Tools"
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo.png",
    badge: data.badge || "/logo.png",
    data: { url: data.url || "/notifications" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/notifications"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      })
  )
})