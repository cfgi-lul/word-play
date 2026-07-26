import { evaluateGuess, satisfiesHardMode } from './game.service';
import { attemptsForDifficulty } from './game.types';

describe('difficulty helpers', () => {
  it('maps difficulty to attempt counts', () => {
    expect(attemptsForDifficulty('easy')).toBe(8);
    expect(attemptsForDifficulty('normal')).toBe(6);
    expect(attemptsForDifficulty('hard')).toBe(5);
  });

  it('requires green letters to stay in place on hard mode', () => {
    const solution = 'crane';
    const previous = ['crate'];
    expect(evaluateGuess(previous.at(0)!, solution)).toEqual([
      'correct',
      'correct',
      'correct',
      'absent',
      'correct',
    ]);
    expect(satisfiesHardMode('plane', previous, solution)).toBe(false);
    expect(satisfiesHardMode('crane', previous, solution)).toBe(true);
  });

  it('requires yellow letters to be reused on hard mode', () => {
    const solution = 'crane';
    const previous = ['outer'];
    expect(evaluateGuess(previous.at(0)!, solution)).toContain('present');
    expect(satisfiesHardMode('plaid', previous, solution)).toBe(false);
    expect(satisfiesHardMode('reach', previous, solution)).toBe(true);
  });
});
