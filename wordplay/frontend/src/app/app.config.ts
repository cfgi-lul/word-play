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
      closable: false,
      size: 'm',
    }),
  ],
};
