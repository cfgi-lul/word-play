/**
 * Curate EN/RU dictionaries from game-proven public word lists.
 *
 * English:
 * - 5-letter answers/guesses: official Wordle lists
 * - 4/6/7: Google 10k ∩ ENABLE (common playable words), frequency-ranked tiers
 *
 * Russian:
 * - Answers/guesses: Harrix Russian-Nouns (Efremova-based noun lemmas),
 *   frequency-ranked into easy/medium/hard
 *
 * Sources live in scripts/dict-data/ (not shipped in the Angular build).
 *
 * Run from frontend/: npm run curate:dictionaries
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
  4: 1200,
  5: 2000,
  6: 1600,
  7: 1500,
};

function loadLines(file, { optional = false } = {}) {
  if (!fs.existsSync(file)) {
    if (optional) return [];
    throw new Error(`Missing ${file}`);
  }
  return fs
    .readFileSync(file, 'utf8')
    .split(/\n/)
    .map((line) => line.trim().toLowerCase().replaceAll('ё', 'е'))
    .filter((line) => line && !line.startsWith('#'));
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

function writeDictionary({ lang, length, easy, medium, hard, guesses, note }) {
  const exportBase = `WORDS_${length}_${lang.toUpperCase()}`;
  const label = lang === 'en' ? 'English' : 'Russian';
  const content = `/** ${label} ${length}-letter dictionary with explicit difficulty tiers.
 * ${note}
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

/** Full guess list = answer tiers + extra playable words. */
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

const EN_NAMES = loadSet(path.join(dataDir, 'block-en-names.txt'), { optional: true });
const EN_SURNAMES = loadSet(path.join(dataDir, 'block-en-surnames.txt'), { optional: true });
const EN_FUNCTION = loadSet(path.join(dataDir, 'block-en-function.txt'), { optional: true });
const RU_NAMES = loadSet(path.join(dataDir, 'block-ru-names.txt'), { optional: true });
const RU_FUNCTION = loadSet(path.join(dataDir, 'block-ru-function.txt'), { optional: true });

const enFreq = loadFreq('en_50k.txt');
const ruFreq = loadFreq('ru_50k.txt');
const google10k = loadLines(path.join(dataDir, 'en-google-10k.txt'));
const enable = loadSet(path.join(dataDir, 'en-enable-4-7.txt'));
const enNouns = loadSet(path.join(dataDir, 'en-nouns-4-7.txt'));
const enVerbs = loadSet(path.join(dataDir, 'en-verbs-4-7.txt'));
const enAdjs = loadSet(path.join(dataDir, 'en-adjs-4-7.txt'));
const wordleAnswers = loadLines(path.join(dataDir, 'wordle-answers-nyt.txt')).filter((w) =>
  /^[a-z]{5}$/.test(w),
);
const wordleGuesses = loadLines(path.join(dataDir, 'wordle-guesses-5.txt')).filter((w) =>
  /^[a-z]{5}$/.test(w),
);
const harrixNouns = loadLines(path.join(dataDir, 'ru-harrix-nouns.txt')).filter((w) =>
  /^[а-я]+$/.test(w),
);
const openRussianNouns = loadSet(path.join(dataDir, 'ru-nouns-4-7.txt'));

function isBlockedEnName(word) {
  if (EN_NAMES.has(word)) return true;
  if (!EN_SURNAMES.has(word)) return false;
  const rank = enFreq.get(word);
  return rank === undefined || rank > 5_000;
}

function isBlockedEnCommon(word) {
  return isBlockedEnName(word) || EN_FUNCTION.has(word);
}

function isBlockedRu(word) {
  return RU_NAMES.has(word) || RU_FUNCTION.has(word);
}

function looksLikeRuJunk(word) {
  // Declined / non-lemma noise that sometimes leaks into noun dumps.
  if (/(ами|ями|ах|ях|ого|ему|ому|ими)$/.test(word) && word.length >= 5) return true;
  if (/(ая|яя|ое|ее|ые|ый|ий)$/.test(word) && word.length >= 4) return true;
  return false;
}

function curateEnglish() {
  const noteByLength = {
    5: 'Answers from the official Wordle list (minus closed-class junk); guesses from Wordle valid words.',
    4: 'Common nouns from Google 10k ∩ ENABLE, frequency-ranked.',
    6: 'Common nouns from Google 10k ∩ ENABLE, frequency-ranked.',
    7: 'Common nouns from Google 10k ∩ ENABLE, frequency-ranked.',
  };

  for (const length of LENGTHS) {
    let answers;
    let guessesExtra;

    if (length === 5) {
      // Official Wordle solutions, minus closed-class / junk for cleaner answer tiers.
      // Full Wordle valid list remains available as guesses.
      answers = sortByFreq(
        uniq(wordleAnswers).filter((w) => !isBlockedEnCommon(w)),
        enFreq,
      );
      guessesExtra = sortByFreq(
        uniq([...wordleGuesses, ...wordleAnswers]).filter((w) => w.length === 5 && !EN_NAMES.has(w)),
        enFreq,
      );
    } else {
      const isPlayableAnswer = (w) => {
        if (!/^[a-z]+$/.test(w) || w.length !== length) return false;
        if (isBlockedEnCommon(w) || !enable.has(w)) return false;
        if (!enNouns.has(w)) return false;
        if (enAdjs.has(w)) return false;
        if (enVerbs.has(w) && (enFreq.get(w) ?? 0) < 800) return false;
        if (w.endsWith('ing') || w.endsWith('ly')) return false;
        if (
          w.endsWith('s') &&
          !w.endsWith('ss') &&
          !w.endsWith('us') &&
          !w.endsWith('is') &&
          !w.endsWith('ous')
        ) {
          return false;
        }
        return true;
      };
      const fromGoogle = google10k.filter(isPlayableAnswer);
      const fromFreq = [...enFreq.keys()].filter(
        (w) => isPlayableAnswer(w) && (enFreq.get(w) ?? 999999) <= 35_000,
      );
      answers = sortByFreq(uniq([...fromGoogle, ...fromFreq]), enFreq);
      guessesExtra = sortByFreq(
        uniq(
          [...enable].filter(
            (w) =>
              w.length === length &&
              !isBlockedEnName(w) &&
              enFreq.has(w) &&
              enFreq.get(w) <= 45_000,
          ),
        ),
        enFreq,
      );
    }

    const targets = ANSWER_TARGETS[length];
    const needed = targets.easy + targets.medium + targets.hard;
    const answerPool = answers.slice(0, Math.min(answers.length, needed + 200));
    const { easy, medium, hard } = splitTiers(answerPool, targets);
    const answerSet = new Set([...easy, ...medium, ...hard]);
    const extra = guessesExtra.filter((w) => !answerSet.has(w)).slice(0, EXTRA_GUESS_CAP[length]);
    const guesses = [...easy, ...medium, ...hard, ...extra];

    writeDictionary({
      lang: 'en',
      length,
      easy,
      medium,
      hard,
      guesses,
      note: noteByLength[length],
    });
  }
}

function curateRussian() {
  const note =
    'Noun lemmas from Harrix/Russian-Nouns ∩ OpenRussian, frequency-ranked into tiers.';

  // Extra high-frequency non-answers that leak into noun dumps.
  const ruExtraBlock = new Set(
    `
есть одно сама сами само никто ничто знать стать плохо хорошо можно нужно нельзя
парня парню парне парней людей человека человеку человеком людей жизни жизни
`.match(/[а-я]+/g) ?? [],
  );

  for (const length of LENGTHS) {
    const nouns = sortByFreq(
      uniq(
        harrixNouns.filter(
          (w) =>
            w.length === length &&
            !isBlockedRu(w) &&
            !ruExtraBlock.has(w) &&
            !looksLikeRuJunk(w) &&
            // Prefer lemmas confirmed by both curated noun sources.
            openRussianNouns.has(w),
        ),
      ),
      ruFreq,
    );
    // If intersection is short for hard tiers, allow Harrix-only fill after ranked intersection.
    const harrixOnly = sortByFreq(
      uniq(
        harrixNouns.filter(
          (w) =>
            w.length === length &&
            !isBlockedRu(w) &&
            !ruExtraBlock.has(w) &&
            !looksLikeRuJunk(w) &&
            !openRussianNouns.has(w) &&
            ruFreq.has(w) &&
            ruFreq.get(w) <= 25_000,
        ),
      ),
      ruFreq,
    );

    const ranked = nouns.filter((w) => ruFreq.has(w));
    const rest = [...nouns.filter((w) => !ruFreq.has(w)), ...harrixOnly];
    const answers = [...ranked, ...rest];

    const targets = ANSWER_TARGETS[length];
    const needed = targets.easy + targets.medium + targets.hard;
    const answerPool = answers.slice(0, Math.min(answers.length, needed + 200));
    const { easy, medium, hard } = splitTiers(answerPool, targets);
    const answerSet = new Set([...easy, ...medium, ...hard]);

    const guessPool = sortByFreq(
      uniq(
        harrixNouns.filter(
          (w) =>
            w.length === length &&
            !isBlockedRu(w) &&
            !ruExtraBlock.has(w) &&
            !looksLikeRuJunk(w) &&
            (openRussianNouns.has(w) || (ruFreq.has(w) && ruFreq.get(w) <= 40_000)),
        ),
      ),
      ruFreq,
    );
    const extra = guessPool.filter((w) => !answerSet.has(w)).slice(0, EXTRA_GUESS_CAP[length]);
    const guesses = [...easy, ...medium, ...hard, ...extra];

    writeDictionary({ lang: 'ru', length, easy, medium, hard, guesses, note });
  }
}

console.log('Curating English (Wordle + Google/ENABLE)…');
curateEnglish();
console.log('Curating Russian (Harrix nouns)…');
curateRussian();
console.log('Done.');
