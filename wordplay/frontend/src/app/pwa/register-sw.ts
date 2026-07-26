import { Workbox } from 'workbox-window';

/** Register the Workbox service worker when available (production builds). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // `ng serve` does not emit sw.js; skip noisy failed registrations in local dev.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return;
  }

  const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
  const scope = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
  const swUrl = `${window.location.origin}${scope}sw.js`;
  const wb = new Workbox(swUrl, { scope });

  wb.addEventListener('waiting', () => {
    wb.messageSkipWaiting();
  });

  wb.addEventListener('controlling', () => {
    window.location.reload();
  });

  void wb.register();
}
