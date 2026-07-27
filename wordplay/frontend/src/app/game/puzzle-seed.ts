import {
  type Difficulty,
  type GameLanguage,
  isDifficulty,
  isGameLanguage,
  isWordLength,
  isWordTier,
  type WordLength,
  type WordTier,
} from './game.types';
import { isValidGuess, normalizeLetter } from './words';

export interface PuzzleSeedPayload {
  language: GameLanguage;
  wordLength: WordLength;
  difficulty: Difficulty;
  wordTier: WordTier;
  solution: string;
}

const SEED_VERSION = '1';
const XOR_KEY = 'word-play-seed-v1';

/** Encode puzzle params + answer into a compact URL-safe seed. */
export function encodePuzzleSeed(payload: PuzzleSeedPayload): string {
  const solution = normalizeSolution(payload.solution, payload.language, payload.wordLength);

  const plain = [
    SEED_VERSION,
    payload.language,
    String(payload.wordLength),
    payload.difficulty,
    payload.wordTier,
    solution,
  ].join('|');
  return toBase64Url(xorBytes(utf8Encode(plain), XOR_KEY));
}

/** Decode a seed from the route. Returns null when invalid. */
export function decodePuzzleSeed(seed: string): PuzzleSeedPayload | null {
  if (!seed || seed.length > 256) {
    return null;
  }

  try {
    const plain = utf8Decode(xorBytes(fromBase64Url(seed), XOR_KEY));
    const [version, language, lengthRaw, difficulty, wordTier, solutionRaw] = plain.split('|');
    if (
      version !== SEED_VERSION ||
      !isGameLanguage(language) ||
      !isDifficulty(difficulty) ||
      !isWordTier(wordTier)
    ) {
      return null;
    }
    const wordLength = Number(lengthRaw);
    if (!isWordLength(wordLength) || typeof solutionRaw !== 'string') {
      return null;
    }
    const solution = normalizeSolution(solutionRaw, language, wordLength);
    if (!isValidGuess(solution, wordLength, language)) {
      return null;
    }
    return { language, wordLength, difficulty, wordTier, solution };
  } catch {
    return null;
  }
}

function normalizeSolution(word: string, language: GameLanguage, length: WordLength): string {
  return [...word]
    .map((letter) => normalizeLetter(letter, language))
    .join('')
    .slice(0, length);
}

function xorBytes(bytes: Uint8Array, key: string): Uint8Array {
  const keyBytes = utf8Encode(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(`${padded}${'='.repeat(padLength)}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
