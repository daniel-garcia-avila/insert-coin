// Service worker mínimo de INSERT COIN.
// Solo existe para que la app sea instalable como PWA.
// No cachea datos ni fotos a propósito: son privados y cambian a menudo.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
