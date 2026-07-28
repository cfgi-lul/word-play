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
  private activePointerId: number | null = null;
  private suppressClick = false;
  private readonly pressed = signal<string | null>(null);

  readonly keyStatuses = input<Record<string, KeyStatus>>({});
  readonly disabled = input(false);
  readonly locale = input.required<AppLocale>();
  readonly gameLanguage = input.required<GameLanguage>();

  readonly letter = output<string>();
  readonly backspace = output<void>();
  readonly enter = output<void>();

  readonly rows = computed(() => (this.gameLanguage() === 'ru' ? RU_ROWS : EN_ROWS));

  constructor() {
    this.destroyRef.onDestroy(() => this.clearFlashTimer());
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
    if (this.suppressClick) {
      event.preventDefault();
      return;
    }
    this.commitKey(key);
    this.blurTarget(event);
  }

  onBackspaceClick(event: Event): void {
    if (this.suppressClick) {
      event.preventDefault();
      return;
    }
    this.commitKey('backspace');
    this.blurTarget(event);
  }

  onEnterClick(event: Event): void {
    if (this.suppressClick) {
      event.preventDefault();
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
    this.pressed.set(key);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const key = this.keyFromPoint(event.clientX, event.clientY);
    if (key !== this.pressed()) {
      this.pressed.set(key);
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const key = this.keyFromPoint(event.clientX, event.clientY);
    this.endPointerTracking();
    if (key && !this.disabled()) {
      this.commitKey(key);
    }
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
      return;
    }
    this.endPointerTracking();
    this.pressed.set(null);
  }

  private commitKey(key: string): void {
    this.flash(key);
    this.vibrate();
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
    // Allow the next intentional click (e.g. after a touch) without a stale suppress flag.
    queueMicrotask(() => {
      this.suppressClick = false;
    });
  }

  private vibrate(): void {
    try {
      const vibrateFn = Reflect.get(navigator, 'vibrate');
      if (typeof vibrateFn === 'function') {
        Reflect.apply(vibrateFn, navigator, [HAPTIC_MS]);
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

  private blurTarget(event: Event): void {
    (event.currentTarget as HTMLElement | null)?.blur();
  }
}
