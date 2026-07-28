import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TranslatePipe } from '../../i18n/translate.pipe';
import { type AppLocale } from '../../i18n/translations';
import { type GameLanguage, type KeyStatus } from '../game.types';

const EN_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const;

const RU_ROWS = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
] as const;

const HAPTIC_MS = 12;
const HAPTIC_SLIDE_MS = 8;

interface KeyPopup {
  key: string;
  left: number;
  bottom: number;
  width: number;
  stemWidth: number;
  stemLeft: number;
  edge: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-keyboard',
  imports: [TranslatePipe],
  templateUrl: './keyboard.html',
  styleUrl: './keyboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-lang]': 'gameLanguage()',
    '(lostpointercapture)': 'onPointerCancel($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
  },
})
export class Keyboard {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
  private activePointerId: number | null = null;
  private suppressClick = false;
  private readonly pressed = signal<string | null>(null);
  private readonly popupSignal = signal<KeyPopup | null>(null);

  readonly keyStatuses = input<Record<string, KeyStatus>>({});
  readonly disabled = input(false);
  readonly locale = input.required<AppLocale>();
  readonly gameLanguage = input.required<GameLanguage>();

  readonly letter = output<string>();
  readonly backspace = output<void>();
  readonly enter = output<void>();

  readonly rows = computed(() => (this.gameLanguage() === 'ru' ? RU_ROWS : EN_ROWS));
  readonly popup = this.popupSignal.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearFlashTimer();
      this.clearSuppressClickTimer();
    });
  }

  statusOf(key: string): KeyStatus | 'unused' {
    return this.keyStatuses()[key] ?? 'unused';
  }

  isPressed(key: string): boolean {
    return this.pressed() === key;
  }

  /** Briefly highlight a key (e.g. when typing on a physical keyboard). */
  flash(key: string): void {
    this.pressed.set(key);
    this.clearFlashTimer();
    this.flashTimer = setTimeout(() => {
      if (this.pressed() === key) {
        this.pressed.set(null);
      }
      this.flashTimer = null;
    }, 160);
  }

  onLetterClick(key: string, event: Event): void {
    if (this.consumeSuppressedClick(event)) {
      return;
    }
    this.commitKey(key);
    this.blurTarget(event);
  }

  onBackspaceClick(event: Event): void {
    if (this.consumeSuppressedClick(event)) {
      return;
    }
    this.commitKey('backspace');
    this.blurTarget(event);
  }

  onEnterClick(event: Event): void {
    if (this.consumeSuppressedClick(event)) {
      return;
    }
    this.commitKey('enter');
    this.blurTarget(event);
  }

  onPointerDown(event: PointerEvent): void {
    // Mouse / keyboard activation stays on click for accessibility.
    if (
      this.disabled() ||
      event.pointerType === 'mouse' ||
      event.pointerType === '' ||
      this.activePointerId !== null
    ) {
      return;
    }

    const key = this.keyFromPoint(event.clientX, event.clientY);
    if (!key) {
      return;
    }

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.suppressClick = true;
    this.host.nativeElement.setPointerCapture(event.pointerId);
    this.clearFlashTimer();
    this.setActiveKey(key);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const key = this.keyFromPoint(event.clientX, event.clientY);
    // Between keys: keep the last floating letter until another key is hit.
    if (!key || key === this.pressed()) {
      return;
    }
    this.setActiveKey(key);
    this.vibrate(HAPTIC_SLIDE_MS);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const key = this.keyFromPoint(event.clientX, event.clientY);
    this.endPointerTracking();
    this.popupSignal.set(null);
    if (key && !this.disabled()) {
      this.commitKey(key);
    } else {
      this.pressed.set(null);
    }
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
      return;
    }
    this.endPointerTracking();
    this.popupSignal.set(null);
    this.pressed.set(null);
  }

  private setActiveKey(key: string | null): void {
    this.pressed.set(key);
    this.updatePopup(key);
  }

  private updatePopup(key: string | null): void {
    if (!key || key === 'backspace' || key === 'enter') {
      this.popupSignal.set(null);
      return;
    }

    const root =
      (this.host.nativeElement.querySelector('.keyboard') as HTMLElement | null) ??
      this.host.nativeElement;

    const button = Array.from(root.querySelectorAll('[data-key]')).find(
      (el) => (el as HTMLElement).dataset['key'] === key,
    ) as HTMLElement | undefined;
    if (!button) {
      this.popupSignal.set(null);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const keyRect = button.getBoundingClientRect();
    const stemWidth = keyRect.width;
    const width = Math.max(stemWidth * 1.7, 44);
    const centerX = keyRect.left + keyRect.width / 2 - rootRect.left;
    let left = centerX - width / 2;
    let edge: KeyPopup['edge'] = 'center';

    if (left < 2) {
      left = 2;
      edge = 'left';
    }
    const maxLeft = rootRect.width - width - 2;
    if (left > maxLeft) {
      left = Math.max(2, maxLeft);
      edge = 'right';
    }

    const stemLeft = Math.min(
      Math.max(0, centerX - left - stemWidth / 2),
      Math.max(0, width - stemWidth),
    );

    this.popupSignal.set({
      key,
      left,
      bottom: rootRect.height - (keyRect.top - rootRect.top),
      width,
      stemWidth,
      stemLeft,
      edge,
    });
  }

  private commitKey(key: string): void {
    this.flash(key);
    this.vibrate(HAPTIC_MS);
    if (key === 'backspace') {
      this.backspace.emit();
      return;
    }
    if (key === 'enter') {
      this.enter.emit();
      return;
    }
    this.letter.emit(key);
  }

  private keyFromPoint(clientX: number, clientY: number): string | null {
    const node = document.elementFromPoint(clientX, clientY);
    if (!(node instanceof Element)) {
      return null;
    }
    const button = node.closest<HTMLElement>('[data-key]');
    if (!button || !this.host.nativeElement.contains(button)) {
      return null;
    }
    return button.dataset['key'] ?? null;
  }

  private endPointerTracking(): void {
    this.activePointerId = null;
    // Keep suppressClick until the compatibility click after touch/pen, or a short timeout.
    // Clearing in a microtask is too early — click often arrives after that and double-inserts.
    this.clearSuppressClickTimer();
    this.suppressClickTimer = setTimeout(() => {
      this.suppressClick = false;
      this.suppressClickTimer = null;
    }, 400);
  }

  private consumeSuppressedClick(event: Event): boolean {
    if (!this.suppressClick) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    this.suppressClick = false;
    this.clearSuppressClickTimer();
    return true;
  }

  private vibrate(durationMs: number): void {
    try {
      const vibrateFn = Reflect.get(navigator, 'vibrate');
      if (typeof vibrateFn === 'function') {
        Reflect.apply(vibrateFn, navigator, [durationMs]);
      }
    } catch {
      // Unsupported / blocked — ignore.
    }
  }

  private clearFlashTimer(): void {
    if (this.flashTimer !== null) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  }

  private clearSuppressClickTimer(): void {
    if (this.suppressClickTimer !== null) {
      clearTimeout(this.suppressClickTimer);
      this.suppressClickTimer = null;
    }
  }

  private blurTarget(event: Event): void {
    (event.currentTarget as HTMLElement | null)?.blur();
  }
}
