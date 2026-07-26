import { WORDS_4_EN } from './dictionaries/en/words-4';
import { WORDS_5_EN } from './dictionaries/en/words-5';
import { WORDS_6_EN } from './dictionaries/en/words-6';
import { WORDS_7_EN } from './dictionaries/en/words-7';
import { WORDS_4_RU } from './dictionaries/ru/words-4';
import { WORDS_5_RU } from './dictionaries/ru/words-5';
import { WORDS_6_RU } from './dictionaries/ru/words-6';
import { WORDS_7_RU } from './dictionaries/ru/words-7';
import { type GameLanguage, type WordLength } from './game.types';

const WORDS_BY_LANGUAGE: Record<
  GameLanguage,
  Record<WordLength, readonly string[]>
> = {
  en: {
    4: WORDS_4_EN,
    5: WORDS_5_EN,
    6: WORDS_6_EN,
    7: WORDS_7_EN,
  },
  ru: {
    4: WORDS_4_RU,
    5: WORDS_5_RU,
    6: WORDS_6_RU,
    7: WORDS_7_RU,
  },
};

const VALID_BY_LANGUAGE: Record<GameLanguage, Record<WordLength, ReadonlySet<string>>> = {
  en: {
    4: new Set(WORDS_4_EN),
    5: new Set(WORDS_5_EN),
    6: new Set(WORDS_6_EN),
    7: new Set(WORDS_7_EN),
  },
  ru: {
    4: new Set(WORDS_4_RU),
    5: new Set(WORDS_5_RU),
    6: new Set(WORDS_6_RU),
    7: new Set(WORDS_7_RU),
  },
};

export function normalizeLetter(letter: string, language: GameLanguage): string {
  const value = letter.toLowerCase();
  return language === 'ru' ? value.replaceAll('ё', 'е') : value;
}

export function isPlayableLetter(letter: string, language: GameLanguage): boolean {
  const value = normalizeLetter(letter, language);
  return language === 'ru' ? /^[а-я]$/.test(value) : /^[a-z]$/.test(value);
}

export function isValidGuess(
  word: string,
  length: WordLength,
  language: GameLanguage,
): boolean {
  const normalized = [...word]
    .map((letter) => normalizeLetter(letter, language))
    .join('');
  return (
    normalized.length === length && VALID_BY_LANGUAGE[language][length].has(normalized)
  );
}

export function pickRandomWord(
  length: WordLength,
  language: GameLanguage,
  exclude: ReadonlySet<string> = new Set(),
): string {
  const all = WORDS_BY_LANGUAGE[language][length];
  const available = exclude.size === 0 ? all : all.filter((word) => !exclude.has(word));
  const pool = available.length > 0 ? available : all;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]!;
}
