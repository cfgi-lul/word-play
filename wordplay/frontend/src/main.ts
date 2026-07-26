import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { PwaUpdateService } from './app/pwa/pwa-update.service';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    appRef.injector.get(PwaUpdateService).register();
  })
  .catch((err: unknown) => {
    console.error(err);
  });
