import { UpperCasePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TuiButton, TuiNotificationService, TuiRoot, TuiScrollbar } from '@taiga-ui/core';

import { GameService } from './game/game.service';
import { GameBoard } from './game/game-board/game-board';
import { HowToPlay } from './game/how-to-play/how-to-play';
import { Keyboard } from './game/keyboard/keyboard';
import { HistoryPanel } from './history/history-panel';
import { LocaleService } from './i18n/locale.service';
import { TranslatePipe } from './i18n/translate.pipe';
import { SettingsPanel } from './settings/settings-panel';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [
    TuiRoot,
    TuiButton,
    TuiScrollbar,
    UpperCasePipe,
    GameBoard,
    Keyboard,
    HowToPlay,
    HistoryPanel,
    SettingsPanel,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onWindowKeydown($event)' },
})
export class App {
  private readonly game = inject(GameService);
  private readonly themes = inject(ThemeService);
  private readonly i18n = inject(LocaleService);
  private readonly notifications = inject(TuiNotificationService);
  private readonly hiddenInput = viewChild<ElementRef<HTMLInputElement>>('hiddenInput');
  private readonly onScreenKeyboard = viewChild(Keyboard);

  readonly locale = this.i18n.current;
  readonly board = this.game.board;
  readonly keyboard = this.game.keyboard;
  readonly status = this.game.status;
  readonly solution = this.game.solution;
  readonly isPlaying = this.game.isPlaying;
  readonly wordLength = this.game.wordLength;
  readonly wordLanguage = this.game.language;
  readonly helpOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly historyOpen = signal(false);

  constructor() {
    void this.themes.theme();
    void this.i18n.current();

    afterNextRender(() => {
      if (this.shouldShowIntro()) {
        this.helpOpen.set(true);
      } else {
        this.focusInput();
      }
    });
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (this.helpOpen() || this.settingsOpen() || this.historyOpen()) {
      if (event.key === 'Escape') {
        if (this.settingsOpen()) {
          this.closeSettings();
        } else if (this.historyOpen()) {
          this.closeHistory();
        } else {
          this.closeHelp();
        }
      }
      return;
    }

    if (event.target === this.hiddenInput()?.nativeElement) {
      return;
    }

    this.handleKey(event);
  }

  openHelp(): void {
    this.helpOpen.set(true);
  }

  closeHelp(): void {
    this.markIntroSeen();
    this.helpOpen.set(false);
    queueMicrotask(() => this.focusInput());
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
    queueMicrotask(() => this.focusInput());
  }

  openHistory(): void {
    this.historyOpen.set(true);
  }

  closeHistory(): void {
    this.historyOpen.set(false);
    queueMicrotask(() => this.focusInput());
  }

  focusInput(): void {
    // Never keep a text field focused — that opens the mobile OS keyboard.
    // Physical / Bluetooth keys are handled by window:keydown instead.
    this.hiddenInput()?.nativeElement.blur();
  }

  onPhysicalKeydown(event: KeyboardEvent): void {
    this.handleKey(event);
  }

  onLetter(letter: string): void {
    this.game.addLetter(letter);
    this.focusInput();
  }

  onBackspace(): void {
    this.game.removeLetter();
    this.focusInput();
  }

  submit(): void {
    const result = this.game.submitGuess();

    switch (result) {
      case 'invalid':
        this.notify(this.i18n.t('app.notInWordList'), 'warning');
        break;
      case 'ok':
        if (this.status() === 'won') {
          this.notify(this.i18n.t('app.winToast'), 'positive');
        } else if (this.status() === 'lost') {
          this.notify(
            this.i18n.t('app.lostToast', { word: this.solution().toUpperCase() }),
            'negative',
          );
        }
        break;
      case 'too-short':
        this.notify(this.i18n.t('app.notEnoughLetters'), 'warning');
        break;
      default:
        break;
    }

    this.focusInput();
  }

  playAgain(): void {
    this.game.startNewGame();
    queueMicrotask(() => this.focusInput());
  }

  private handleKey(event: KeyboardEvent): void {
    if (
      !this.isPlaying() ||
      this.helpOpen() ||
      this.settingsOpen() ||
      this.historyOpen() ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.onScreenKeyboard()?.flash('enter');
      this.submit();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.onScreenKeyboard()?.flash('backspace');
      this.game.removeLetter();
      return;
    }

    const letter = this.resolveLetter(event);
    if (!letter) {
      return;
    }

    event.preventDefault();
    this.onScreenKeyboard()?.flash(letter);
    this.game.addLetter(letter);
  }

  private resolveLetter(event: KeyboardEvent): string | null {
    if (this.wordLanguage() === 'ru') {
      const key = event.key.toLowerCase().replaceAll('ё', 'е');
      return /^[а-я]$/.test(key) ? key : null;
    }

    const codeMatch = /^Key([A-Z])$/.exec(event.code);
    if (codeMatch?.at(1)) {
      return codeMatch.at(1)!.toLowerCase();
    }

    if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
      return event.key.toLowerCase();
    }

    return null;
  }

  private shouldShowIntro(): boolean {
    return localStorage.getItem('word-play-intro-seen') !== '1';
  }

  private markIntroSeen(): void {
    localStorage.setItem('word-play-intro-seen', '1');
  }

  private notify(
    message: string,
    appearance: 'warning' | 'positive' | 'negative' | 'info' = 'info',
  ): void {
    this.notifications
      .open(message, {
        appearance,
        block: 'start',
        inline: 'center',
        autoClose: 2200,
        closable: false,
      })
      .subscribe({ error: () => {} });
  }
}
