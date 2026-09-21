// Account data and private pages must always be fetched under the current sign-in.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('work-tracker-reusable')).map(key => caches.delete(key)))).then(() => self.clients.claim())
));
