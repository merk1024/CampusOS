import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Retire legacy shell caches quietly instead of forcing a visible reload.
    Promise.all([
      navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister())
      )),
      typeof caches !== 'undefined'
        ? caches.keys().then((cacheNames) => Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('campusos-shell-'))
              .map((cacheName) => caches.delete(cacheName))
          ))
        : Promise.resolve()
    ])
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
