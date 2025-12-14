/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

declare const self: ServiceWorkerGlobalScope & typeof globalThis & { skipWaiting: () => void };

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import type { WorkboxPlugin } from 'workbox-core';

const asPlugin = (plugin: unknown): WorkboxPlugin => plugin as WorkboxPlugin;

async function authScopedCacheKey(request: Request): Promise<string> {
  const token = request.headers.get('authorization');
  if (!token) return request.url;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const url = new URL(request.url);
  url.searchParams.set('__auth', hashHex);
  return url.toString();
}

void self.skipWaiting();
clientsClaim();

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// Non-SSR fallbacks to index.html
// Production SSR fallbacks to offline.html (except for dev)
if (process.env.MODE !== 'ssr' || process.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
      denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/],
    }),
  );
}

// Cache static assets (scripts/styles) aggressively with SWR
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      asPlugin(new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 })), // 7 days
    ],
  }),
);

// Cache icons/fonts
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-media',
    plugins: [
      asPlugin(new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 })), // 30 days
      asPlugin(new CacheableResponsePlugin({ statuses: [0, 200] })),
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && url.origin === self.location.origin && url.pathname === '/channels',
  async ({ request }) => {
    const cache = await caches.open('api-channels-public');
    const cacheKey = await authScopedCacheKey(request);
    try {
      const networkResp = await fetch(request);
      if (networkResp && networkResp.ok) {
        try {
          const cloned = networkResp.clone();
          const json = await cloned.json();
          const filteredChannels = Array.isArray(json.channels)
            ? json.channels.filter((c: { type?: string }) => c.type === 'public')
            : [];
          const filteredBody = JSON.stringify({ ...json, channels: filteredChannels });
          const filteredResponse = new Response(filteredBody, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
          });
          await cache.put(cacheKey, filteredResponse.clone());
        } catch (error) {
          console.error('SW: failed to cache public channels', error);
        }
        return networkResp;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      throw error;
    }
  },
);
