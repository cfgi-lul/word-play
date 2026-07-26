import { Pipe, PipeTransform } from '@angular/core';

import { type AppLocale, type TranslationKey, TRANSLATIONS } from './translations';

@Pipe({
  name: 't',
  pure: true,
})
export class TranslatePipe implements PipeTransform {
  transform(
    key: TranslationKey,
    locale: AppLocale,
    params?: Record<string, string | number>,
  ): string {
    const template = TRANSLATIONS[locale][key] ?? TRANSLATIONS.en[key] ?? key;
    if (!params) {
      return template;
    }

    return Object.entries(params).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  }
}
