import { TestBed } from '@angular/core/testing';

import { computeGameStats, HistoryService } from './history.service';

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
      status: 'won',
      attempts: 3,
    });

    expect(history.count()).toBe(1);
    expect(history.all().at(0)?.word).toBe('crane');
    expect(history.usedWords(5, 'en').has('crane')).toBe(true);
    expect(history.usedWords(4, 'en').has('crane')).toBe(false);
  });

  it('does not duplicate the same finished word for a language/length', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      status: 'won',
      attempts: 2,
    });
    history.record({
      word: 'crane',
      language: 'en',
      length: 5,
      status: 'lost',
      attempts: 6,
    });

    expect(history.count()).toBe(1);
    expect(history.all().at(0)?.status).toBe('won');
  });

  it('exposes live stats from recorded games', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const history = TestBed.inject(HistoryService);

    history.record({
      word: 'about',
      language: 'en',
      length: 5,
      status: 'won',
      attempts: 2,
    });
    history.record({
      word: 'apple',
      language: 'en',
      length: 5,
      status: 'lost',
      attempts: 6,
    });

    expect(history.stats().played).toBe(2);
    expect(history.stats().wins).toBe(1);
    expect(history.stats().losses).toBe(1);
    expect(history.stats().winRate).toBe(50);
  });

  it('returns empty stats for no games', () => {
    expect(computeGameStats([])).toEqual({
      played: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      lossRate: 0,
      currentWinStreak: 0,
      maxWinStreak: 0,
      attemptDistribution: Array.from({ length: 8 }, (_, index) => ({
        attempts: index + 1,
        count: 0,
        share: 0,
      })),
    });
  });

  it('computes win/loss shares, streaks, and attempt distribution', () => {
    const stats = computeGameStats([
      {
        word: 'aaaaa',
        language: 'en',
        length: 5,
        status: 'won',
        attempts: 3,
        finishedAt: '2026-01-01T10:00:00.000Z',
      },
      {
        word: 'bbbbb',
        language: 'en',
        length: 5,
        status: 'won',
        attempts: 2,
        finishedAt: '2026-01-02T10:00:00.000Z',
      },
      {
        word: 'ccccc',
        language: 'en',
        length: 5,
        status: 'lost',
        attempts: 6,
        finishedAt: '2026-01-03T10:00:00.000Z',
      },
      {
        word: 'ddddd',
        language: 'en',
        length: 5,
        status: 'won',
        attempts: 3,
        finishedAt: '2026-01-04T10:00:00.000Z',
      },
      {
        word: 'eeeee',
        language: 'en',
        length: 5,
        status: 'won',
        attempts: 4,
        finishedAt: '2026-01-05T10:00:00.000Z',
      },
    ]);

    expect(stats.played).toBe(5);
    expect(stats.wins).toBe(4);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(80);
    expect(stats.lossRate).toBe(20);
    expect(stats.maxWinStreak).toBe(2);
    expect(stats.currentWinStreak).toBe(2);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 2)?.count).toBe(1);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 3)?.count).toBe(2);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 3)?.share).toBe(50);
    expect(stats.attemptDistribution.find((bucket) => bucket.attempts === 6)?.count).toBe(0);
  });
});
