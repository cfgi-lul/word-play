import {
  WORDS_4_EN,
  WORDS_4_EN_EASY,
  WORDS_4_EN_HARD,
  WORDS_4_EN_MEDIUM,
} from './dictionaries/en/words-4';
import {
  WORDS_5_EN,
  WORDS_5_EN_EASY,
  WORDS_5_EN_HARD,
  WORDS_5_EN_MEDIUM,
} from './dictionaries/en/words-5';
import {
  WORDS_6_EN,
  WORDS_6_EN_EASY,
  WORDS_6_EN_HARD,
  WORDS_6_EN_MEDIUM,
} from './dictionaries/en/words-6';
import {
  WORDS_7_EN,
  WORDS_7_EN_EASY,
  WORDS_7_EN_HARD,
  WORDS_7_EN_MEDIUM,
} from './dictionaries/en/words-7';
import {
  WORDS_4_RU,
  WORDS_4_RU_EASY,
  WORDS_4_RU_HARD,
  WORDS_4_RU_MEDIUM,
} from './dictionaries/ru/words-4';
import {
  WORDS_5_RU,
  WORDS_5_RU_EASY,
  WORDS_5_RU_HARD,
  WORDS_5_RU_MEDIUM,
} from './dictionaries/ru/words-5';
import {
  WORDS_6_RU,
  WORDS_6_RU_EASY,
  WORDS_6_RU_HARD,
  WORDS_6_RU_MEDIUM,
} from './dictionaries/ru/words-6';
import {
  WORDS_7_RU,
  WORDS_7_RU_EASY,
  WORDS_7_RU_HARD,
  WORDS_7_RU_MEDIUM,
} from './dictionaries/ru/words-7';
import { DEFAULT_WORD_TIER, type GameLanguage, type WordLength, type WordTier } from './game.types';

const WORDS_BY_LANGUAGE: Record<GameLanguage, Record<WordLength, readonly string[]>> = {
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

const ANSWERS_BY_TIER: Record<
  GameLanguage,
  Record<WordLength, Record<WordTier, readonly string[]>>
> = {
  en: {
    4: { easy: WORDS_4_EN_EASY, medium: WORDS_4_EN_MEDIUM, hard: WORDS_4_EN_HARD },
    5: { easy: WORDS_5_EN_EASY, medium: WORDS_5_EN_MEDIUM, hard: WORDS_5_EN_HARD },
    6: { easy: WORDS_6_EN_EASY, medium: WORDS_6_EN_MEDIUM, hard: WORDS_6_EN_HARD },
    7: { easy: WORDS_7_EN_EASY, medium: WORDS_7_EN_MEDIUM, hard: WORDS_7_EN_HARD },
  },
  ru: {
    4: { easy: WORDS_4_RU_EASY, medium: WORDS_4_RU_MEDIUM, hard: WORDS_4_RU_HARD },
    5: { easy: WORDS_5_RU_EASY, medium: WORDS_5_RU_MEDIUM, hard: WORDS_5_RU_HARD },
    6: { easy: WORDS_6_RU_EASY, medium: WORDS_6_RU_MEDIUM, hard: WORDS_6_RU_HARD },
    7: { easy: WORDS_7_RU_EASY, medium: WORDS_7_RU_MEDIUM, hard: WORDS_7_RU_HARD },
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

const TIER_BY_WORD: Record<GameLanguage, Record<WordLength, ReadonlyMap<string, WordTier>>> = {
  en: {
    4: buildTierMap(ANSWERS_BY_TIER.en[4]),
    5: buildTierMap(ANSWERS_BY_TIER.en[5]),
    6: buildTierMap(ANSWERS_BY_TIER.en[6]),
    7: buildTierMap(ANSWERS_BY_TIER.en[7]),
  },
  ru: {
    4: buildTierMap(ANSWERS_BY_TIER.ru[4]),
    5: buildTierMap(ANSWERS_BY_TIER.ru[5]),
    6: buildTierMap(ANSWERS_BY_TIER.ru[6]),
    7: buildTierMap(ANSWERS_BY_TIER.ru[7]),
  },
};

function buildTierMap(tiers: Record<WordTier, readonly string[]>): ReadonlyMap<string, WordTier> {
  const map = new Map<string, WordTier>();
  for (const tier of ['easy', 'medium', 'hard'] as const) {
    for (const word of tiers[tier]) {
      map.set(word, tier);
    }
  }
  return map;
}

export function normalizeLetter(letter: string, language: GameLanguage): string {
  const value = letter.toLowerCase();
  return language === 'ru' ? value.replaceAll('ё', 'е') : value;
}

export function isPlayableLetter(letter: string, language: GameLanguage): boolean {
  const value = normalizeLetter(letter, language);
  return language === 'ru' ? /^[а-я]$/.test(value) : /^[a-z]$/.test(value);
}

export function isValidGuess(word: string, length: WordLength, language: GameLanguage): boolean {
  const normalized = [...word].map((letter) => normalizeLetter(letter, language)).join('');
  return normalized.length === length && VALID_BY_LANGUAGE[language][length].has(normalized);
}

export function wordTierOf(
  word: string,
  length: WordLength,
  language: GameLanguage,
): WordTier | null {
  return TIER_BY_WORD[language][length].get(word) ?? null;
}

export function pickRandomWord(
  length: WordLength,
  language: GameLanguage,
  exclude: ReadonlySet<string> = new Set(),
  tier: WordTier = DEFAULT_WORD_TIER,
): string {
  const answers = ANSWERS_BY_TIER[language][length][tier];
  const available = exclude.size === 0 ? answers : answers.filter((word) => !exclude.has(word));
  const pool = available.length > 0 ? available : answers;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? WORDS_BY_LANGUAGE[language][length].at(0)!;
}
