/**
 * Service Worker: App-Shell offline verfügbar machen.
 * Bei Änderungen an Dateien CACHE_VERSION erhöhen.
 */
'use strict';

const CACHE_VERSION = 'guitar-trainer-v1.3.1';
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css?v=1.3.1',
  './js/chords.js?v=1.3.1',
  './js/detection.js?v=1.3.1',
  './js/pitch.js?v=1.3.1',
  './js/tuning.js?v=1.3.1',
  './js/stats.js?v=1.3.1',
  './js/prefs.js?v=1.3.1',
  './js/pentatonic.js?v=1.3.1',
  './js/songs.js?v=1.3.1',
  './js/fretboard.js?v=1.3.1',
  './js/metronome.js?v=1.3.1',
  './js/audio.js?v=1.3.1',
  './js/app.js?v=1.3.1',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
