import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { type AppLocale } from '../../i18n/translations';
import { TranslatePipe } from '../../i18n/translate.pipe';
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

@Component({
  selector: 'app-keyboard',
  imports: [TranslatePipe],
  templateUrl: './keyboard.html',
  styleUrl: './keyboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-lang]': 'gameLanguage()',
  },
})
export class Keyboard {
  private readonly destroyRef = inject(DestroyRef);
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
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
    }, 140);
  }

  onLetter(key: string, event: Event): void {
    if (!this.disabled()) {
      this.letter.emit(key);
    }
    this.blurTarget(event);
  }

  onBackspace(event: Event): void {
    if (!this.disabled()) {
      this.backspace.emit();
    }
    this.blurTarget(event);
  }

  onEnter(event: Event): void {
    if (!this.disabled()) {
      this.enter.emit();
    }
    this.blurTarget(event);
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
