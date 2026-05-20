// Service Worker: Ye background mein chalta rahega
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log("Service Worker Activated!");
});

// Background mein notification dikhane ke liye logic
self.onmessage = (event) => {
    if (event.data && event.data.type === 'SHOW_ALARM') {
        self.registration.showNotification("📚 Study Time!", {
            body: `Bhai, ${event.data.subject} ka time ho gaya!`,
            icon: '/icon.png', // Agar icon hai toh path do
            vibrate: [200, 100, 200],
            tag: 'study-alarm'
        });
    }
};