import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const resetKey = 'campusos-sw-reset-v1';

    Promise.all([
      navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister())
      ).then(() => registrations.length)),
      typeof caches !== 'undefined'
        ? caches.keys().then((cacheNames) => Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('campusos-shell-'))
              .map((cacheName) => caches.delete(cacheName))
          ))
        : Promise.resolve()
    ])
      .then(([registrationCount]) => {
        if (registrationCount > 0 && sessionStorage.getItem(resetKey) !== 'done') {
          sessionStorage.setItem(resetKey, 'done');
          window.location.reload();
          return;
        }

        sessionStorage.removeItem(resetKey);
      })
      .catch((error) => {
        console.error('CampusOS service worker cleanup failed:', error);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
