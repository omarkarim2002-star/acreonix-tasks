// public/sw.js — Acreonix Tasks service worker
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Acreonix Tasks', {
      body: data.body ?? '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.tag ?? 'acreonix',
      data: { url: data.url ?? '/dashboard' },
      actions: data.actions ?? [],
      requireInteraction: data.requireInteraction ?? false,
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/dashboard'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
