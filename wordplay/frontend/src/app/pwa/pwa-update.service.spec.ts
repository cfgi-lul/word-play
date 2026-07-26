import { TestBed } from '@angular/core/testing';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('skips registration on localhost and keeps updateAvailable false', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PwaUpdateService);

    service.register();

    expect(service.updateAvailable()).toBe(false);
    expect(service.isApplyingUpdate()).toBe(false);
  });

  it('reloads when applying an update without a waiting worker', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PwaUpdateService);
    const reload = vi.fn();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    await service.applyUpdate();

    expect(reload).toHaveBeenCalled();
  });
});
