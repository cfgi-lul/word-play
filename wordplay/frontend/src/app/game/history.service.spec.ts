import { TestBed } from '@angular/core/testing';

import { HistoryService } from './history.service';

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
});
