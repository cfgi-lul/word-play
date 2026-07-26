import { TestBed } from '@angular/core/testing';

import { DifficultyService } from './difficulty.service';
import { computeGameStats, HistoryService } from './history.service';
import { WordTierService } from './word-tier.service';

describe('HistoryService', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('records finished games and exposes used words', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    history.record({
      word: 'Crane',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      status: 'won',
      attempts: 3,
    });

    expect(history.count()).toBe(1);
    expect(history.all().at(0)?.word).toBe('crane');
    expect(history.usedWords(5, 'en').has('crane')).toBe(true);
    expect(history.usedWords(4, 'en').has('crane')).toBe(false);
  });

  it('does not duplicate the same finished word for a mode', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      status: 'won',
      attempts: 2,
    });
    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      status: 'lost',
      attempts: 6,
    });

    expect(history.count()).toBe(1);
    expect(history.all().at(0)?.status).toBe('won');
  });

  it('allows the same word under a different difficulty or dictionary', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      status: 'won',
      attempts: 2,
    });
    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      difficulty: 'hard',
      wordTier: 'medium',
      status: 'lost',
      attempts: 5,
    });
    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'hard',
      status: 'won',
      attempts: 4,
    });

    expect(history.count()).toBe(3);
  });

  it('scopes stats and history list to the current difficulty and dictionary', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);
    const difficulties = TestBed.inject(DifficultyService);
    const wordTiers = TestBed.inject(WordTierService);

    history.record({
      word: 'about',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      status: 'won',
      attempts: 2,
    });
    history.record({
      word: 'apple',
      language: 'en',
      length: 5,
      difficulty: 'hard',
      wordTier: 'medium',
      status: 'lost',
      attempts: 5,
    });
    history.record({
      word: 'bloom',
      language: 'en',
      length: 5,
      difficulty: 'normal',
      wordTier: 'easy',
      status: 'won',
      attempts: 3,
    });

    expect(difficulties.difficulty()).toBe('normal');
    expect(wordTiers.wordTier()).toBe('medium');
    expect(history.forCurrentMode()).toHaveLength(1);
    expect(history.stats().played).toBe(1);
    expect(history.stats().wins).toBe(1);
    expect(history.stats().attemptDistribution).toHaveLength(6);

    difficulties.setDifficulty('hard');
    expect(history.forCurrentMode()).toHaveLength(1);
    expect(history.stats().played).toBe(1);
    expect(history.stats().losses).toBe(1);
    expect(history.stats().attemptDistribution).toHaveLength(5);

    difficulties.setDifficulty('normal');
    wordTiers.setTier('easy');
    expect(history.forCurrentMode().at(0)?.word).toBe('bloom');
    expect(history.stats().played).toBe(1);
  });

  it('loads legacy history entries with default difficulty and dictionary', () => {
    localStorage.setItem(
      'word-play-history',
      JSON.stringify([
        {
          word: 'crane',
          language: 'en',
          length: 5,
          status: 'won',
          attempts: 3,
          finishedAt: '2026-01-01T10:00:00.000Z',
        },
      ]),
    );
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    expect(history.all().at(0)).toEqual(
      expect.objectContaining({
        word: 'crane',
        difficulty: 'normal',
        wordTier: 'medium',
      }),
    );
    expect(history.forCurrentMode()).toHaveLength(1);
  });

  it('returns empty stats for no games', () => {
    expect(computeGameStats([], 6)).toEqual({
      played: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      lossRate: 0,
      currentWinStreak: 0,
      maxWinStreak: 0,
      attemptDistribution: Array.from({ length: 6 }, (_, index) => ({
        attempts: index + 1,
        count: 0,
        share: 0,
      })),
    });
  });

  it('computes win/loss shares, streaks, and attempt distribution', () => {
    const stats = computeGameStats(
      [
        {
          word: 'aaaaa',
          language: 'en',
          length: 5,
          difficulty: 'normal',
          wordTier: 'medium',
          status: 'won',
          attempts: 3,
          finishedAt: '2026-01-01T10:00:00.000Z',
        },
        {
          word: 'bbbbb',
          language: 'en',
          length: 5,
          difficulty: 'normal',
          wordTier: 'medium',
          status: 'won',
          attempts: 2,
          finishedAt: '2026-01-02T10:00:00.000Z',
        },
        {
          word: 'ccccc',
          language: 'en',
          length: 5,
          difficulty: 'normal',
          wordTier: 'medium',
          status: 'lost',
          attempts: 6,
          finishedAt: '2026-01-03T10:00:00.000Z',
        },
        {
          word: 'ddddd',
          language: 'en',
          length: 5,
          difficulty: 'normal',
          wordTier: 'medium',
          status: 'won',
          attempts: 3,
          finishedAt: '2026-01-04T10:00:00.000Z',
        },
        {
          word: 'eeeee',
          language: 'en',
          length: 5,
          difficulty: 'normal',
          wordTier: 'medium',
          status: 'won',
          attempts: 4,
          finishedAt: '2026-01-05T10:00:00.000Z',
        },
      ],
      6,
    );

    expect(stats.played).toBe(5);
    expect(stats.wins).toBe(4);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(80);
    expect(stats.lossRate).toBe(20);
    expect(stats.maxWinStreak).toBe(2);
    expect(stats.currentWinStreak).toBe(2);
    expect(stats.attemptDistribution).toHaveLength(6);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 2)?.count).toBe(1);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 3)?.count).toBe(2);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 3)?.share).toBe(50);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 6)?.count).toBe(0);
  });
});
