import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import {
  type AppLocale,
  type TranslationKey,
  TRANSLATIONS,
} from './translations';

const STORAGE_KEY = 'word-play-locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly locale = signal<AppLocale>(this.readInitial());

  readonly current = this.locale.asReadonly();
  readonly dictionary = computed(() => TRANSLATIONS[this.locale()]);

  constructor() {
    this.apply(this.locale());
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    this.apply(locale);
    localStorage.setItem(STORAGE_KEY, locale);
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const template = this.dictionary()[key] ?? TRANSLATIONS.en[key] ?? key;
    if (!params) {
      return template;
    }

    return Object.entries(params).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  }

  private readInitial(): AppLocale {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ru') {
      return stored;
    }

    return this.detectDeviceLocale();
  }

  private detectDeviceLocale(): AppLocale {
    const languages = this.document.defaultView?.navigator.languages?.length
      ? [...this.document.defaultView.navigator.languages]
      : [this.document.defaultView?.navigator.language ?? 'en'];

    for (const language of languages) {
      const normalized = language.toLowerCase();
      if (normalized === 'ru' || normalized.startsWith('ru-')) {
        return 'ru';
      }
      if (normalized === 'en' || normalized.startsWith('en-')) {
        return 'en';
      }
    }

    return 'en';
  }

  private apply(locale: AppLocale): void {
    this.document.documentElement.lang = locale;
  }
}
