


const CACHE_NAME = "offline-notes-v1";


const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
];


self.addEventListener("install", (event) => {
 
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting(); 
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim()) 
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // only cache simple reads

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
