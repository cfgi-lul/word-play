import { Location, UpperCasePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiButton, TuiNotificationService } from '@taiga-ui/core';
import { merge } from 'rxjs';

import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { HelpService } from '../navigation/help.service';
import { NavigationService } from '../navigation/navigation.service';
import { classicPlayUrl, dailyPlayUrl } from '../navigation/play-url';
import { dailyDateKey } from './daily-word';
import { GameService } from './game.service';
import { isGameLanguage, isWordLength } from './game.types';
import { GameBoard } from './game-board/game-board';
import { Keyboard } from './keyboard/keyboard';
import { shareGameResult } from './share-result';

@Component({
  selector: 'app-game-page',
  imports: [TuiButton, UpperCasePipe, GameBoard, Keyboard, TranslatePipe],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onWindowKeydown($event)' },
})
export class GamePage {
  private readonly game = inject(GameService);
  private readonly i18n = inject(LocaleService);
  private readonly navigation = inject(NavigationService);
  private readonly help = inject(HelpService);
  private readonly notifications = inject(TuiNotificationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hiddenInput = viewChild<ElementRef<HTMLInputElement>>('hiddenInput');
  private readonly onScreenKeyboard = viewChild(Keyboard);

  /** Bound from `/classic/:seed` via withComponentInputBinding. */
  readonly seed = input<string | undefined>(undefined);
  /** Bound from `/daily/:date`. */
  readonly date = input<string | undefined>(undefined);

  readonly locale = this.i18n.current;
  readonly board = this.game.board;
  readonly keyboard = this.game.keyboard;
  readonly status = this.game.status;
  readonly solution = this.game.solution;
  readonly isPlaying = this.game.isPlaying;
  readonly wordLength = this.game.wordLength;
  readonly wordLanguage = this.game.language;
  readonly gameMode = this.game.mode;
  readonly difficulty = this.game.difficulty;
  readonly wordTier = this.game.wordTier;
  readonly maxAttempts = this.game.maxAttempts;
  readonly dailyDate = this.game.dailyDate;
  readonly canPlayAgain = this.game.canPlayAgain;
  readonly canUseHint = this.game.canUseHint;
  readonly hintsUsed = this.game.hintsUsed;
  readonly sharing = signal(false);

  constructor() {
    merge(this.route.paramMap, this.route.queryParamMap, this.route.data)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.syncRouteToGame();
      });

    afterNextRender(() => {
      queueMicrotask(() => this.blurHiddenInput());
    });
  }

  goHome(): void {
    this.navigation.goHome();
  }

  openHelp(): void {
    this.help.show();
  }

  /** Keep the hidden field unfocused so the mobile OS keyboard stays closed. */
  blurHiddenInput(): void {
    this.hiddenInput()?.nativeElement.blur();
  }

  onPhysicalKeydown(event: KeyboardEvent): void {
    this.handleKey(event);
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (this.help.open() || event.target === this.hiddenInput()?.nativeElement) {
      return;
    }
    this.handleKey(event);
  }

  onLetter(letter: string): void {
    this.game.addLetter(letter);
    this.blurHiddenInput();
  }

  onBackspace(): void {
    this.game.removeLetter();
    this.blurHiddenInput();
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
    this.blurHiddenInput();
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

    this.blurHiddenInput();
  }

  playAgain(): void {
    this.game.startNewGame();
    const nextSeed = this.game.puzzleSeed();
    if (nextSeed) {
      this.navigation.replaceClassicSeed(nextSeed);
    }
    queueMicrotask(() => this.blurHiddenInput());
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
        playUrl: this.currentPlayUrl(),
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
          playLinkLabel: this.i18n.t('app.sharePlayLink'),
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

  private syncRouteToGame(): void {
    const mode = this.route.snapshot.data['mode'];
    if (mode === 'classic') {
      this.syncClassicRoute();
      return;
    }
    if (mode === 'daily') {
      this.syncDailyRoute();
    }
  }

  private syncClassicRoute(): void {
    const seed = this.seed() ?? this.route.snapshot.paramMap.get('seed') ?? undefined;
    if (seed) {
      if (this.game.mode() === 'classic' && this.game.puzzleSeed() === seed) {
        return;
      }
      if (!this.game.activateClassicSeed(seed)) {
        this.notify(this.i18n.t('app.invalidSeed'), 'warning');
        this.navigation.goHome();
      }
      return;
    }

    if (this.game.mode() !== 'classic') {
      this.game.activateMode('classic');
    }
    const nextSeed = this.game.puzzleSeed();
    if (nextSeed) {
      this.navigation.replaceClassicSeed(nextSeed);
    }
  }

  private syncDailyRoute(): void {
    const rawDate = this.date() ?? this.route.snapshot.paramMap.get('date') ?? undefined;
    const dateKey = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : dailyDateKey();
    const langParam = this.route.snapshot.queryParamMap.get('lang');
    const lenParam = Number(this.route.snapshot.queryParamMap.get('len'));
    const language = isGameLanguage(langParam) ? langParam : this.game.language();
    const length = isWordLength(lenParam) ? lenParam : this.game.wordLength();

    const alreadyActive =
      this.game.mode() === 'daily' &&
      this.game.dailyDate() === dateKey &&
      this.game.language() === language &&
      this.game.wordLength() === length;

    if (!alreadyActive) {
      this.game.activateDailyDate(dateKey, language, length);
    }

    if (!rawDate || langParam !== language || String(lenParam) !== String(length)) {
      this.navigation.replaceDailyDate(dateKey, language, length);
    }
  }

  private currentPlayUrl(): string | undefined {
    if (this.gameMode() === 'classic') {
      const seed = this.game.puzzleSeed();
      return seed ? classicPlayUrl(this.router, this.location, seed) : undefined;
    }

    const dateKey = this.dailyDate();
    if (!dateKey) {
      return undefined;
    }
    return dailyPlayUrl(
      this.router,
      this.location,
      dateKey,
      this.wordLanguage(),
      this.wordLength(),
    );
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isPlaying() || this.help.open() || event.metaKey || event.ctrlKey || event.altKey) {
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

  private notify(
    message: string,
    appearance: 'warning' | 'positive' | 'negative' | 'info' = 'info',
  ): void {
    this.notifications
      .open(message, { appearance })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }
}
