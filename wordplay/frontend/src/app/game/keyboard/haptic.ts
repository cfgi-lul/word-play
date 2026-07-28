/**
 * Light tactile feedback for key presses.
 *
 * - Android / supported browsers: Vibration API (`navigator.vibrate`).
 * - iPhone: Apple does not implement the Vibration API in any browser.
 *   As a best-effort fallback on iOS 18+, toggling a hidden
 *   `<input type="checkbox" switch>` during a user gesture can fire a
 *   system haptic. Newer iOS versions may block programmatic triggers.
 */

let iosSwitch: HTMLInputElement | null = null;
let iosLabel: HTMLLabelElement | null = null;

function ensureIosSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  if (iosLabel && iosSwitch && document.contains(iosLabel)) {
    return iosLabel;
  }

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  Object.assign(input.style, {
    position: 'fixed',
    insetInlineStart: '0',
    insetBlockStart: '0',
    width: '1px',
    height: '1px',
    margin: '0',
    opacity: '0',
    pointerEvents: 'none',
  });

  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  Object.assign(label.style, {
    position: 'fixed',
    insetInlineStart: '0',
    insetBlockStart: '0',
    width: '1px',
    height: '1px',
    margin: '0',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
  });
  label.append(input);
  document.body.append(label);

  iosSwitch = input;
  iosLabel = label;
  return label;
}

function triggerIosSwitchHaptic(): void {
  const label = ensureIosSwitch();
  if (!label) {
    return;
  }

  try {
    // Must run synchronously inside a user gesture (pointerup / click).
    label.click();
  } catch {
    // Ignore — unsupported / blocked.
  }
}

export function triggerHaptic(durationMs: number): void {
  try {
    const vibrateFn = Reflect.get(navigator, 'vibrate');
    if (typeof vibrateFn === 'function') {
      Reflect.apply(vibrateFn, navigator, [durationMs]);
      return;
    }
  } catch {
    // Fall through to iOS workaround.
  }

  triggerIosSwitchHaptic();
}

/** Test helper / teardown for environments that create the iOS switch host. */
export function resetHapticForTests(): void {
  iosLabel?.remove();
  iosSwitch = null;
  iosLabel = null;
}
