/**
 * Curate EN/RU dictionaries into noun-only answer tiers + broader guess lists.
 *
 * Answers: common nouns in base/lemma form (no proper names, adjectives, verbs).
 * Guesses: answers + base adjectives + infinitives/base verbs (still no names/junk).
 *
 * Lexicon sources (scripts/dict-data/):
 * - Moby POS extracts: en-{nouns,adjs,verbs}-4-7.txt
 * - OpenRussian extracts: ru-{nouns,adjs,verbs}-4-7.txt
 * - FrequencyWords: en_50k.txt, ru_50k.txt
 * - Name/function blocklists: block-{en,ru}-{names,function,surnames}.txt
 *
 * Run from frontend/: node scripts/curate-dictionaries.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'dict-data');
const dictDir = path.join(root, 'src/app/game/dictionaries');

const LENGTHS = [4, 5, 6, 7];

const ANSWER_TARGETS = {
  4: { easy: 280, medium: 220, hard: 500 },
  5: { easy: 320, medium: 260, hard: 600 },
  6: { easy: 320, medium: 260, hard: 600 },
  7: { easy: 300, medium: 240, hard: 550 },
};

const EXTRA_GUESS_CAP = {
  4: 1000,
  5: 1400,
  6: 1400,
  7: 1300,
};

/** Max frequency rank (0 = most common) accepted into answer pools. */
const MAX_ANSWER_FREQ_RANK = {
  en: 45_000,
  ru: 48_000,
};

/** Rarer nouns may still fill hard tiers when easy/medium targets are met. */
const MAX_HARD_FILL_FREQ_RANK = {
  en: 49_999,
  ru: 49_999,
};

const MAX_GUESS_FREQ_RANK = {
  en: 45_000,
  ru: 48_000,
};

/** Surnames that collide with common nouns stay if frequent enough. */
const SURNAME_KEEP_MAX_RANK = 5_000;

function loadLines(file, { optional = false } = {}) {
  if (!fs.existsSync(file)) {
    if (optional) return [];
    throw new Error(`Missing ${file}`);
  }
  return fs
    .readFileSync(file, 'utf8')
    .split(/\n/)
    .map((line) => line.trim().toLowerCase().replaceAll('ё', 'е'))
    .filter(Boolean);
}

function loadSet(file, { optional = false } = {}) {
  return new Set(loadLines(file, { optional }));
}

function loadFreq(file) {
  const rank = new Map();
  let i = 0;
  for (const line of fs.readFileSync(path.join(dataDir, file), 'utf8').split(/\n/)) {
    const word = line.trim().split(/\s+/)[0]?.toLowerCase().replaceAll('ё', 'е');
    if (!word || rank.has(word)) continue;
    rank.set(word, i++);
  }
  return rank;
}

function chunkLines(words, perLine = 10) {
  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    const slice = words.slice(i, i + perLine);
    lines.push(`  ${slice.map((word) => `'${word}'`).join(', ')},`);
  }
  return lines.join('\n');
}

function uniq(words) {
  return [...new Set(words)];
}

function sortByFreq(words, freq) {
  return [...words].sort((a, b) => {
    const ra = freq.has(a) ? freq.get(a) : 1_000_000;
    const rb = freq.has(b) ? freq.get(b) : 1_000_000;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

function splitTiers(sortedAnswers, targets) {
  const easy = sortedAnswers.slice(0, targets.easy);
  const medium = sortedAnswers.slice(targets.easy, targets.easy + targets.medium);
  let hard = sortedAnswers.slice(targets.easy + targets.medium);
  const hardCap = Math.ceil(targets.hard * 1.25);
  if (hard.length > hardCap) {
    hard = hard.slice(0, hardCap);
  }
  return { easy, medium, hard };
}

function looksLikeEnPlural(word) {
  if (word.endsWith('ss') || word.endsWith('us') || word.endsWith('is') || word.endsWith('ous')) {
    return false;
  }
  if (word.endsWith('ies') || word.endsWith('ves')) return true;
  if (word.endsWith('s') && !word.endsWith('ss')) return true;
  return false;
}

function looksLikeRuNonLemma(word) {
  if (/(ая|яя|ое|ее|ые|ый|ий|ой)$/.test(word) && word.length >= 4) return true;
  if (/(ами|ями|ах|ях)$/.test(word) && word.length >= 5) return true;
  return false;
}

const EN_NAMES = loadSet(path.join(dataDir, 'block-en-names.txt'));
const EN_SURNAMES = loadSet(path.join(dataDir, 'block-en-surnames.txt'), { optional: true });
const RU_NAMES = loadSet(path.join(dataDir, 'block-ru-names.txt'));
const EN_FUNCTION = loadSet(path.join(dataDir, 'block-en-function.txt'));
const RU_FUNCTION = loadSet(path.join(dataDir, 'block-ru-function.txt'));

const enNouns = loadSet(path.join(dataDir, 'en-nouns-4-7.txt'));
const enAdjs = loadSet(path.join(dataDir, 'en-adjs-4-7.txt'));
const enVerbs = loadSet(path.join(dataDir, 'en-verbs-4-7.txt'));
const ruNouns = loadSet(path.join(dataDir, 'ru-nouns-4-7.txt'));
const ruAdjs = loadSet(path.join(dataDir, 'ru-adjs-4-7.txt'));
const ruVerbs = loadSet(path.join(dataDir, 'ru-verbs-4-7.txt'));
const enFreq = loadFreq('en_50k.txt');
const ruFreq = loadFreq('ru_50k.txt');

function isBlockedEnName(word) {
  if (EN_NAMES.has(word)) return true;
  if (!EN_SURNAMES.has(word)) return false;
  const rank = enFreq.get(word);
  return rank === undefined || rank > SURNAME_KEEP_MAX_RANK;
}

function isEnAnswer(word, { maxRank = MAX_ANSWER_FREQ_RANK.en, allowDualVerb = false } = {}) {
  if (!/^[a-z]+$/.test(word) || word.length < 4 || word.length > 7) return false;
  if (isBlockedEnName(word) || EN_FUNCTION.has(word)) return false;
  if (!enNouns.has(word)) return false;
  if (enAdjs.has(word)) return false;
  if (enVerbs.has(word)) {
    // Replenish pools with mid-frequency noun/verb duals (e.g. plant, watch)
    // while still excluding ultra-common verb-primary words.
    if (!allowDualVerb) return false;
    const rank = enFreq.get(word);
    if (rank === undefined || rank < 800 || rank > 20_000) return false;
  }
  if (word.endsWith('ly') || word.endsWith('ing') || word.endsWith('ed')) return false;
  if (looksLikeEnPlural(word)) return false;
  // Require attested frequency — unranked Moby nouns are mostly obscure names/jargon.
  if (!enFreq.has(word)) return false;
  if (enFreq.get(word) > maxRank) return false;
  return true;
}

function isRuAnswer(word, { maxRank = MAX_ANSWER_FREQ_RANK.ru, requireFreq = true } = {}) {
  const w = word.replaceAll('ё', 'е');
  if (!/^[а-я]+$/.test(w) || w.length < 4 || w.length > 7) return false;
  if (RU_NAMES.has(w) || RU_FUNCTION.has(w)) return false;
  if (!ruNouns.has(w)) return false;
  if (ruAdjs.has(w) || ruVerbs.has(w)) return false;
  if (looksLikeRuNonLemma(w)) return false;
  if (requireFreq) {
    if (!ruFreq.has(w)) return false;
    if (ruFreq.get(w) > maxRank) return false;
  }
  return true;
}

function isEnGuess(word) {
  if (!/^[a-z]+$/.test(word) || word.length < 4 || word.length > 7) return false;
  if (isBlockedEnName(word) || EN_FUNCTION.has(word)) return false;
  const isLex = enNouns.has(word) || enAdjs.has(word) || enVerbs.has(word);
  if (!isLex) return false;
  if (word.endsWith('ing') && enVerbs.has(word) && !enNouns.has(word)) return false;
  if (word.endsWith('ed') && enVerbs.has(word) && !enNouns.has(word)) return false;
  const rank = enFreq.get(word);
  return rank !== undefined && rank <= MAX_GUESS_FREQ_RANK.en;
}

function isRuGuess(word) {
  const w = word.replaceAll('ё', 'е');
  if (!/^[а-я]+$/.test(w) || w.length < 4 || w.length > 7) return false;
  if (RU_NAMES.has(w) || RU_FUNCTION.has(w)) return false;
  if (looksLikeRuNonLemma(w) && !ruNouns.has(w)) return false;
  const isLex = ruNouns.has(w) || ruAdjs.has(w) || ruVerbs.has(w);
  if (!isLex) return false;
  const rank = ruFreq.get(w);
  return rank !== undefined && rank <= MAX_GUESS_FREQ_RANK.ru;
}

function writeDictionary({ lang, length, easy, medium, hard, guesses }) {
  const exportBase = `WORDS_${length}_${lang.toUpperCase()}`;
  const label = lang === 'en' ? 'English' : 'Russian';
  const content = `/** ${label} ${length}-letter dictionary with explicit difficulty tiers.
 * Answer pools are common nouns in base/lemma form (no proper names, adjectives,
 * or verbs). The full guess list also includes a limited set of base-form
 * adjectives and verbs so players can still probe the board.
 */
export const ${exportBase}_EASY: readonly string[] = [
${chunkLines(easy)}
];

export const ${exportBase}_MEDIUM: readonly string[] = [
${chunkLines(medium)}
];

export const ${exportBase}_HARD: readonly string[] = [
${chunkLines(hard)}
];

/** Full guess list = answer tiers + extra base-form playable words. */
export const ${exportBase}: readonly string[] = [
${chunkLines(guesses)}
];
`;
  const rel = `${lang}/words-${length}.ts`;
  fs.writeFileSync(path.join(dictDir, rel), content);
  console.log(
    `${rel}: easy=${easy.length} medium=${medium.length} hard=${hard.length} guesses=${guesses.length}`,
  );
}

function curate(lang) {
  const freq = lang === 'en' ? enFreq : ruFreq;
  const isGuess = lang === 'en' ? isEnGuess : isRuGuess;
  const hardFillRank = MAX_HARD_FILL_FREQ_RANK[lang];
  const answerRank = MAX_ANSWER_FREQ_RANK[lang];
  const nounLexicon = lang === 'en' ? enNouns : ruNouns;

  for (const length of LENGTHS) {
    const fromFreq = [...freq.keys()].filter((w) => w.length === length);
    const fromLexicon = [...nounLexicon].filter((w) => w.length === length);

    let ranked;
    let rest;
    if (lang === 'en') {
      const pure = sortByFreq(uniq(fromFreq.filter((w) => isEnAnswer(w, { maxRank: answerRank }))), freq);
      const duals = sortByFreq(
        uniq(fromFreq.filter((w) => isEnAnswer(w, { maxRank: answerRank, allowDualVerb: true }))).filter(
          (w) => !pure.includes(w),
        ),
        freq,
      );
      ranked = [...pure, ...duals];
      rest = sortByFreq(
        uniq(
          fromFreq.filter((w) =>
            isEnAnswer(w, { maxRank: hardFillRank, allowDualVerb: true }),
          ),
        ).filter((w) => !ranked.includes(w)),
        freq,
      );
    } else {
      ranked = sortByFreq(uniq(fromFreq.filter((w) => isRuAnswer(w, { maxRank: answerRank }))), freq);
      // Replenish hard tiers from OpenRussian lemmas even without frequency ranks.
      rest = sortByFreq(
        uniq(fromLexicon.filter((w) => isRuAnswer(w, { requireFreq: false }))).filter(
          (w) => !ranked.includes(w),
        ),
        freq,
      );
    }

    const answers = [...ranked, ...rest];
    const targets = ANSWER_TARGETS[length];
    const needed = targets.easy + targets.medium + targets.hard;
    const answerPool = answers.slice(0, Math.min(answers.length, needed + 200));
    const { easy, medium, hard } = splitTiers(answerPool, targets);
    const answerSet = new Set([...easy, ...medium, ...hard]);

    const extra = sortByFreq(
      uniq([...fromFreq, ...fromLexicon].filter(isGuess)).filter((w) => !answerSet.has(w)),
      freq,
    ).slice(0, EXTRA_GUESS_CAP[length]);

    const guesses = [...easy, ...medium, ...hard, ...extra];
    writeDictionary({ lang, length, easy, medium, hard, guesses });
  }
}

console.log('Curating English…');
curate('en');
console.log('Curating Russian…');
curate('ru');
console.log('Done.');
