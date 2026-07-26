import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { TUI_DARK_MODE } from '@taiga-ui/core';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'word-play-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly taigaDarkMode = inject(TUI_DARK_MODE);
  private readonly mediaQuery = this.document.defaultView?.matchMedia(
    '(prefers-color-scheme: dark)',
  );
  private readonly mode = signal<ThemeMode>(this.readInitial());
  private readonly systemDark = signal(this.mediaQuery?.matches ?? false);

  readonly theme = this.mode.asReadonly();
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const mode = this.mode();
    if (mode === 'system') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return mode;
  });
  readonly isDark = computed(() => this.resolvedTheme() === 'dark');

  constructor() {
    this.bindSystemPreference();
    this.apply(this.resolvedTheme());
  }

  setTheme(theme: ThemeMode): void {
    this.mode.set(theme);
    this.apply(this.resolvedTheme());
    localStorage.setItem(STORAGE_KEY, theme);
  }

  private readInitial(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }

    return 'system';
  }

  private bindSystemPreference(): void {
    const media = this.mediaQuery;
    if (!media) {
      return;
    }

    const onChange = (event: MediaQueryListEvent): void => {
      this.systemDark.set(event.matches);
      if (this.mode() === 'system') {
        this.apply(this.resolvedTheme());
      }
    };

    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }

  private apply(resolved: ResolvedTheme): void {
    const root = this.document.documentElement;
    root.dataset['theme'] = resolved;
    root.style.colorScheme = resolved;
    this.taigaDarkMode.set(resolved === 'dark');
  }
}
