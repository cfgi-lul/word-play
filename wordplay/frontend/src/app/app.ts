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
import { type GameMode } from './game/game.types';
import { GameBoard } from './game/game-board/game-board';
import { HowToPlay } from './game/how-to-play/how-to-play';
import { Keyboard } from './game/keyboard/keyboard';
import { shareGameResult } from './game/share-result';
import { HistoryPanel } from './history/history-panel';
import { HomeScreen } from './home/home-screen';
import { LocaleService } from './i18n/locale.service';
import { TranslatePipe } from './i18n/translate.pipe';
import { NavigationService } from './navigation/navigation.service';
import { PwaUpdateService } from './pwa/pwa-update.service';
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
    HomeScreen,
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
  private readonly updates = inject(PwaUpdateService);
  private readonly navigation = inject(NavigationService);
  private readonly notifications = inject(TuiNotificationService);
  private readonly hiddenInput = viewChild<ElementRef<HTMLInputElement>>('hiddenInput');
  private readonly onScreenKeyboard = viewChild(Keyboard);

  readonly locale = this.i18n.current;
  readonly screen = this.navigation.screen;
  readonly board = this.game.board;
  readonly keyboard = this.game.keyboard;
  readonly status = this.game.status;
  readonly solution = this.game.solution;
  readonly isPlaying = this.game.isPlaying;
  readonly wordLength = this.game.wordLength;
  readonly maxAttempts = this.game.maxAttempts;
  readonly wordLanguage = this.game.language;
  readonly gameMode = this.game.mode;
  readonly difficulty = this.game.difficulty;
  readonly wordTier = this.game.wordTier;
  readonly dailyDate = this.game.dailyDate;
  readonly canPlayAgain = this.game.canPlayAgain;
  readonly canUseHint = this.game.canUseHint;
  readonly hintsUsed = this.game.hintsUsed;
  readonly updateAvailable = this.updates.updateAvailable;
  readonly helpOpen = signal(false);
  readonly sharing = signal(false);

  constructor() {
    void this.themes.theme();
    void this.i18n.current();

    afterNextRender(() => {
      if (this.shouldShowIntro()) {
        this.helpOpen.set(true);
      }
    });
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (this.helpOpen() || this.screen() !== 'game') {
      if (event.key === 'Escape' && this.helpOpen()) {
        this.closeHelp();
      }
      return;
    }

    if (event.target === this.hiddenInput()?.nativeElement) {
      return;
    }

    this.handleKey(event);
  }

  openClassic(): void {
    this.openGame('classic');
  }

  openDaily(): void {
    this.openGame('daily');
  }

  openStats(): void {
    this.navigation.openStats();
  }

  openSettings(): void {
    this.navigation.openSettings();
  }

  goHome(): void {
    this.navigation.goHome();
  }

  openHelp(): void {
    this.helpOpen.set(true);
  }

  closeHelp(): void {
    this.markIntroSeen();
    this.helpOpen.set(false);
    if (this.screen() === 'game') {
      queueMicrotask(() => this.focusInput());
    }
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

  useHint(): void {
    const result = this.game.useHint();
    switch (result) {
      case 'no-unknown':
        this.notify(this.i18n.t('app.hintUnavailable'), 'warning');
        break;
      case 'none-left':
        this.notify(this.i18n.t('app.hintNoneLeft'), 'warning');
        break;
      case 'ok':
        this.notify(this.i18n.t('app.hintRevealed'), 'positive');
        break;
      default:
        break;
    }
    this.focusInput();
  }

  submit(): void {
    const result = this.game.submitGuess();

    switch (result) {
      case 'hard-mode':
        this.notify(this.i18n.t('app.hardModeViolation'), 'warning');
        break;
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

  async shareResult(): Promise<void> {
    const status = this.status();
    if (status === 'playing' || this.sharing()) {
      return;
    }

    this.sharing.set(true);
    try {
      const outcome = await shareGameResult({
        board: this.board(),
        status,
        mode: this.gameMode(),
        difficulty: this.difficulty(),
        wordTier: this.wordTier(),
        language: this.wordLanguage(),
        maxAttempts: this.maxAttempts(),
        hintsUsed: this.hintsUsed(),
        dailyDate: this.dailyDate(),
        labels: {
          title: this.i18n.t('app.title'),
          modeClassic: this.i18n.t('app.shareModeClassic'),
          modeDaily: this.i18n.t('app.shareModeDaily'),
          won: this.i18n.t('app.shareWon'),
          lost: this.i18n.t('app.shareLost'),
          attemptsLabel: this.i18n.t('app.shareAttempts'),
          dictionaryLabel: this.i18n.t('app.shareDictionary'),
          languageLabel: this.i18n.t('app.shareLanguage'),
          hintsLabel: this.i18n.t('app.shareHints'),
          hardModeLabel: this.i18n.t('app.shareHardMode'),
          hardModeOn: this.i18n.t('app.shareHardModeOn'),
          difficulty: {
            easy: this.i18n.t('settings.difficulty.easy'),
            normal: this.i18n.t('settings.difficulty.normal'),
            hard: this.i18n.t('settings.difficulty.hard'),
          },
          dictionary: {
            easy: this.i18n.t('settings.dictionary.easy'),
            medium: this.i18n.t('settings.dictionary.medium'),
            hard: this.i18n.t('settings.dictionary.hard'),
          },
          language: {
            en: this.i18n.t('history.languageEn'),
            ru: this.i18n.t('history.languageRu'),
          },
        },
      });

      if (outcome === 'shared') {
        this.notify(this.i18n.t('app.shareShared'), 'positive');
      } else if (outcome === 'copied') {
        this.notify(this.i18n.t('app.shareCopied'), 'positive');
      }
    } catch {
      this.notify(this.i18n.t('app.shareFailed'), 'warning');
    } finally {
      this.sharing.set(false);
    }
  }

  private openGame(mode: GameMode): void {
    this.game.activateMode(mode);
    this.navigation.openGame();
    queueMicrotask(() => this.focusInput());
  }

  private handleKey(event: KeyboardEvent): void {
    if (
      this.screen() !== 'game' ||
      !this.isPlaying() ||
      this.helpOpen() ||
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
