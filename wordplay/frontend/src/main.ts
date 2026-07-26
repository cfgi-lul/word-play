import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { registerServiceWorker } from './app/pwa/register-sw';

bootstrapApplication(App, appConfig)
  .then(() => {
    registerServiceWorker();
  })
  .catch((err: unknown) => {
    console.error(err);
  });
