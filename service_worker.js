const CACHE_NAME = "huishouden-todo-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./images/app-icon.png",
    "./images/app-icon-192.png",
    "./images/background_pattern.png"
];

self.addEventListener("install", function(event) {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(APP_FILES);
            })
    );

    self.skipWaiting();
});


self.addEventListener("activate", function(event) {

    event.waitUntil(
        caches.keys().then(function(cacheNames) {

            return Promise.all(

                cacheNames
                    .filter(function(cacheName) {
                        return cacheName !== CACHE_NAME;
                    })
                    .map(function(cacheName) {
                        return caches.delete(cacheName);
                    })

            );

        })
    );

    self.clients.claim();
});


self.addEventListener("fetch", function(event) {

    event.respondWith(

        fetch(event.request)
            .catch(function() {
                return caches.match(event.request);
            })

    );

});

if ("serviceWorker" in navigator) {

    window.addEventListener("load", function() {

        navigator.serviceWorker
            .register("./service_worker.js")
            .then(function(registration) {
                console.log("Service Worker actief:", registration.scope);
            })
            .catch(function(error) {
                console.error("Service Worker fout:", error);
            });

    });

}