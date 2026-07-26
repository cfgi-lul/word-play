/**
 * Rewrite dictionary files into explicit easy / medium / hard answer pools.
 *
 * Dictionaries are ordered as curated common words, then a rare alphabetical fill.
 * We split the common head into easy + medium and treat the rare fill as hard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** Manual rare-section starts (index of first hard word), tuned per file. */
const RARE_START = {
  'en/words-4.ts': 1100,
  'en/words-5.ts': 510,
  'en/words-6.ts': 1496,
  'en/words-7.ts': 1449,
  'ru/words-4.ts': 644,
  'ru/words-5.ts': 999,
  'ru/words-6.ts': 1269,
  'ru/words-7.ts': 1395,
};

const FILES = [
  { rel: 'en/words-4.ts', exportBase: 'WORDS_4_EN', lang: 'English', length: 4 },
  { rel: 'en/words-5.ts', exportBase: 'WORDS_5_EN', lang: 'English', length: 5 },
  { rel: 'en/words-6.ts', exportBase: 'WORDS_6_EN', lang: 'English', length: 6 },
  { rel: 'en/words-7.ts', exportBase: 'WORDS_7_EN', lang: 'English', length: 7 },
  { rel: 'ru/words-4.ts', exportBase: 'WORDS_4_RU', lang: 'Russian', length: 4 },
  { rel: 'ru/words-5.ts', exportBase: 'WORDS_5_RU', lang: 'Russian', length: 5 },
  { rel: 'ru/words-6.ts', exportBase: 'WORDS_6_RU', lang: 'Russian', length: 6 },
  { rel: 'ru/words-7.ts', exportBase: 'WORDS_7_RU', lang: 'Russian', length: 7 },
];

function extractWords(source) {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function chunkLines(words, perLine = 10) {
  const lines = [];
  for (let i = 0; i < words.length; i += perLine) {
    const slice = words.slice(i, i + perLine);
    lines.push(`  ${slice.map((word) => `'${word}'`).join(', ')},`);
  }
  return lines.join('\n');
}

function writeDictionary({ rel, exportBase, lang, length }) {
  const filePath = path.join(root, 'src/app/game/dictionaries', rel);
  const words = extractWords(fs.readFileSync(filePath, 'utf8'));
  const rareStart = RARE_START[rel] ?? Math.floor(words.length * 0.35);
  const common = words.slice(0, rareStart);
  const hard = words.slice(rareStart);
  const easyEnd = Math.max(1, Math.floor(common.length * 0.55));
  const easy = common.slice(0, easyEnd);
  const medium = common.slice(easyEnd);

  const content = `/** ${lang} ${length}-letter dictionary with explicit difficulty tiers. */
export const ${exportBase}_EASY: readonly string[] = [
${chunkLines(easy)}
];

export const ${exportBase}_MEDIUM: readonly string[] = [
${chunkLines(medium)}
];

export const ${exportBase}_HARD: readonly string[] = [
${chunkLines(hard)}
];

/** Full guess list = all tiers. Answers are chosen from the selected tier. */
export const ${exportBase}: readonly string[] = [
  ...${exportBase}_EASY,
  ...${exportBase}_MEDIUM,
  ...${exportBase}_HARD,
];
`;

  fs.writeFileSync(filePath, content);
  console.log(
    `${rel}: easy=${easy.length}, medium=${medium.length}, hard=${hard.length}, total=${words.length}`,
  );
}

for (const file of FILES) {
  writeDictionary(file);
}
