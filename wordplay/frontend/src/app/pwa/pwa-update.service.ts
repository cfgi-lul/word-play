import { Injectable, signal } from '@angular/core';
import { Workbox } from 'workbox-window';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private workbox: Workbox | null = null;
  private registered = false;

  private readonly available = signal(false);
  private readonly applying = signal(false);

  readonly updateAvailable = this.available.asReadonly();
  readonly isApplyingUpdate = this.applying.asReadonly();

  /** Register the service worker and start periodic update checks. */
  register(): void {
    if (this.registered || !this.canUseServiceWorker()) {
      return;
    }

    this.registered = true;

    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const scope = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    const swUrl = `${window.location.origin}${scope}sw.js`;
    const wb = new Workbox(swUrl, { scope });
    this.workbox = wb;

    wb.addEventListener('waiting', () => {
      this.available.set(true);
    });

    wb.addEventListener('controlling', () => {
      window.location.reload();
    });

    void wb.register().then((registration) => {
      if (registration?.waiting) {
        this.available.set(true);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdate();
      }
    });

    window.addEventListener('focus', () => {
      void this.checkForUpdate();
    });

    window.setInterval(() => {
      void this.checkForUpdate();
    }, CHECK_INTERVAL_MS);
  }

  async checkForUpdate(): Promise<void> {
    if (!this.workbox) {
      return;
    }

    try {
      await this.workbox.update();
    } catch {
      // Offline / blocked update checks should stay silent.
    }
  }

  /** Activate a waiting worker when present, otherwise reload the app. */
  async applyUpdate(): Promise<void> {
    if (this.applying()) {
      return;
    }

    this.applying.set(true);

    try {
      await this.checkForUpdate();

      if (this.available() && this.workbox) {
        this.workbox.messageSkipWaiting();
        // Fallback if the controlling event does not fire promptly.
        window.setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      this.applying.set(false);
    }
  }

  private canUseServiceWorker(): boolean {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    // `ng serve` does not emit sw.js; skip noisy failed registrations in local dev.
    return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
  }
}
