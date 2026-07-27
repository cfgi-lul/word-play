import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTaiga, tuiNotificationOptionsProvider } from '@taiga-ui/core';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideTaiga({ scrollbars: 'custom' }),
    tuiNotificationOptionsProvider({
      block: 'start',
      inline: 'center',
      autoClose: 2200,
      // Must stay dismissible: Taiga pauses autoClose on mouseenter, and sticky
      // hover/touch on iOS can leave a toast up forever without a close button.
      closable: true,
      size: 'm',
    }),
  ],
};
