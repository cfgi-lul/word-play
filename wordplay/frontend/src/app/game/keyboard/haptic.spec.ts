import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetHapticForTests, triggerHaptic } from './haptic';

describe('triggerHaptic', () => {
  afterEach(() => {
    resetHapticForTests();
    vi.restoreAllMocks();
  });

  it('uses navigator.vibrate when available', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    triggerHaptic(12);

    expect(vibrate).toHaveBeenCalledWith(12);
    expect(document.querySelector('input[switch]')).toBeNull();
  });

  it('falls back to an iOS checkbox switch when vibrate is missing', () => {
    vi.stubGlobal('navigator', { ...navigator, vibrate: undefined });
    const click = vi.spyOn(HTMLElement.prototype, 'click');

    triggerHaptic(12);

    const switchInput = document.querySelector('input[switch]');
    expect(switchInput).not.toBeNull();
    expect(click).toHaveBeenCalled();
  });
});
