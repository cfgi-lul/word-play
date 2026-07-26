import {
  type Board,
  type Difficulty,
  type GameLanguage,
  type GameMode,
  type GameStatus,
  type LetterStatus,
  type WordTier,
} from './game.types';

export type ShareTile = Extract<LetterStatus, 'correct' | 'present' | 'absent'>;

export interface ShareResultLabels {
  title: string;
  modeClassic: string;
  modeDaily: string;
  won: string;
  lost: string;
  attemptsLabel: string;
  dictionaryLabel: string;
  languageLabel: string;
  hintsLabel: string;
  hardModeLabel: string;
  hardModeOn: string;
  playLinkLabel: string;
  difficulty: Record<Difficulty, string>;
  dictionary: Record<WordTier, string>;
  language: Record<GameLanguage, string>;
}

export interface ShareResultInput {
  board: Board;
  status: Exclude<GameStatus, 'playing'>;
  mode: GameMode;
  difficulty: Difficulty;
  wordTier: WordTier;
  language: GameLanguage;
  maxAttempts: number;
  hintsUsed: number;
  dailyDate?: string;
  /** Absolute URL friends can open to play the same puzzle. */
  playUrl?: string;
  labels: ShareResultLabels;
}

const TILE_COLORS: Record<ShareTile, string> = {
  correct: '#1a73e8',
  present: '#e8b000',
  absent: '#7a8499',
};

const TILE_EMOJI: Record<ShareTile, string> = {
  correct: '🟦',
  present: '🟨',
  absent: '⬛',
};

const SHARE_MIN_WIDTH = 320;
const SHARE_MAX_WIDTH = 720;
const SHARE_PAD = 24;
const SHARE_TITLE_SIZE = 28;
const SHARE_LINE_SIZE = 18;
const SHARE_LINE_GAP = 8;

export function guessRowsFromBoard(board: Board): ShareTile[][] {
  return board
    .filter((row) =>
      row.every(
        (tile) =>
          tile.status === 'correct' || tile.status === 'present' || tile.status === 'absent',
      ),
    )
    .map((row) => row.map((tile) => tile.status as ShareTile));
}

export function buildShareText(input: ShareResultInput): string {
  const rows = guessRowsFromBoard(input.board);

  const lines = [
    input.labels.title,
    resultHeadline(input, rows.length),
    '',
    ...rows.map((row) => row.map((tile) => TILE_EMOJI[tile]).join('')),
    '',
    ...metaLines(input),
  ];
  return lines.join('\n');
}

export function renderShareImage(input: ShareResultInput): Blob {
  const rows = guessRowsFromBoard(input.board);
  const cols = rows.at(0)?.length ?? 0;
  const tile = 44;
  const gap = 8;
  const gridWidth = cols > 0 ? cols * tile + (cols - 1) * gap : 0;
  const gridHeight = rows.length > 0 ? rows.length * tile + (rows.length - 1) * gap : 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas unavailable');
  }

  const headline = resultHeadline(input, rows.length);
  const meta = metaLines(input);
  const minContentWidth = Math.max(gridWidth, SHARE_MIN_WIDTH - SHARE_PAD * 2);
  const maxContentWidth = SHARE_MAX_WIDTH - SHARE_PAD * 2;

  ctx.font = `800 ${SHARE_TITLE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const titleWidth = ctx.measureText(input.labels.title).width;
  ctx.font = `700 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const headlineWidth = ctx.measureText(headline).width;
  ctx.font = `600 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const metaWidths = meta.map((line) => ctx.measureText(line).width);
  const naturalContentWidth = Math.max(minContentWidth, titleWidth, headlineWidth, ...metaWidths);
  const contentWidth = Math.min(maxContentWidth, naturalContentWidth);

  ctx.font = `800 ${SHARE_TITLE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const titleLines = wrapLine(
    input.labels.title,
    contentWidth,
    (value) => ctx.measureText(value).width,
  );
  ctx.font = `700 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const headlineLines = wrapLine(headline, contentWidth, (value) => ctx.measureText(value).width);
  ctx.font = `600 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  const metaWrapped = meta.flatMap((line) =>
    wrapLine(line, contentWidth, (value) => ctx.measureText(value).width),
  );

  const textBlockHeight =
    titleLines.length * (SHARE_TITLE_SIZE + SHARE_LINE_GAP) +
    headlineLines.length * (SHARE_LINE_SIZE + SHARE_LINE_GAP) +
    SHARE_PAD -
    SHARE_LINE_GAP +
    metaWrapped.length * (SHARE_LINE_SIZE + SHARE_LINE_GAP);

  const width = Math.ceil(contentWidth + SHARE_PAD * 2);
  const height = Math.ceil(SHARE_PAD + textBlockHeight + gridHeight + SHARE_PAD);
  canvas.width = width * 2;
  canvas.height = height * 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(2, 2);
  ctx.fillStyle = '#152033';
  ctx.fillRect(0, 0, width, height);

  let y = SHARE_PAD;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${SHARE_TITLE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, SHARE_PAD, y + SHARE_TITLE_SIZE * 0.8);
    y += SHARE_TITLE_SIZE + SHARE_LINE_GAP;
  }

  ctx.fillStyle = '#9aa8c0';
  ctx.font = `700 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  for (const line of headlineLines) {
    ctx.fillText(line, SHARE_PAD, y + SHARE_LINE_SIZE * 0.8);
    y += SHARE_LINE_SIZE + SHARE_LINE_GAP;
  }
  y += SHARE_PAD - SHARE_LINE_GAP;

  const gridX = (width - gridWidth) / 2;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols; c++) {
      const status = rows[r]?.[c];
      if (!status) {
        continue;
      }
      const x = gridX + c * (tile + gap);
      const top = y + r * (tile + gap);
      fillRoundRect(ctx, {
        x,
        y: top,
        width: tile,
        height: tile,
        radius: 8,
        color: TILE_COLORS[status],
      });
    }
  }
  y += gridHeight + SHARE_PAD;

  ctx.fillStyle = '#e8eef8';
  ctx.font = `600 ${SHARE_LINE_SIZE}px Manrope, "Segoe UI", sans-serif`;
  for (const line of metaWrapped) {
    ctx.fillText(line, SHARE_PAD, y + SHARE_LINE_SIZE * 0.8);
    y += SHARE_LINE_SIZE + SHARE_LINE_GAP;
  }

  return canvasToPng(canvas);
}

export async function shareGameResult(
  input: ShareResultInput,
): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = buildShareText(input);
  const image = renderShareImage(input);
  const file = new File([image], 'word-play-result.png', { type: 'image/png' });

  try {
    if (typeof navigator.share === 'function') {
      const payload: ShareData = { title: input.labels.title, text, files: [file] };
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        return 'shared';
      }

      const textOnly: ShareData = { title: input.labels.title, text };
      if (!navigator.canShare || navigator.canShare(textOnly)) {
        await navigator.share(textOnly);
        return 'shared';
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      return 'cancelled';
    }
  }

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
      return 'copied';
    } catch {
      // Fall through to text-only copy.
    }
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
}

/** Wrap a single line so each segment fits within maxWidth (character-aware for URLs). */
export function wrapLine(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  if (maxWidth <= 0 || measure(text) <= maxWidth) {
    return [text];
  }

  if (!/\s/.test(text)) {
    return wrapByCharacters(text, maxWidth, measure);
  }

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }

    const parts = wrapByCharacters(word, maxWidth, measure);
    lines.push(...parts.slice(0, -1));
    current = parts.at(-1) ?? '';
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [text];
}

function wrapByCharacters(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  let current = '';

  for (const char of text) {
    const next = `${current}${char}`;
    if (current && measure(next) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [text];
}

function resultHeadline(input: ShareResultInput, guesses: number): string {
  const mode =
    input.mode === 'daily'
      ? `${input.labels.modeDaily}${input.dailyDate ? ` ${input.dailyDate}` : ''}`
      : input.labels.modeClassic;

  const score =
    input.status === 'won'
      ? `${input.labels.won} ${guesses}/${input.maxAttempts}`
      : `${input.labels.lost} X/${input.maxAttempts}`;
  return `${mode} · ${score}`;
}

function metaLines(input: ShareResultInput): string[] {
  const lines = [
    `${input.labels.attemptsLabel}: ${input.labels.difficulty[input.difficulty]}`,
    `${input.labels.dictionaryLabel}: ${input.labels.dictionary[input.wordTier]}`,
    `${input.labels.languageLabel}: ${input.labels.language[input.language]}`,
  ];
  if (input.hintsUsed > 0) {
    lines.push(`${input.labels.hintsLabel}: ${input.hintsUsed}`);
  }
  if (input.difficulty === 'hard') {
    lines.push(`${input.labels.hardModeLabel}: ${input.labels.hardModeOn}`);
  }
  if (input.playUrl) {
    // Keep the long URL on its own line so share cards can wrap it cleanly.
    lines.push(`${input.labels.playLinkLabel}:`, input.playUrl);
  }
  return lines;
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number; radius: number; color: string },
): void {
  const radius = Math.min(rect.radius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
  ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
  ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
  ctx.closePath();
  ctx.fillStyle = rect.color;
  ctx.fill();
}

function canvasToPng(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png');
  const [header, data = ''] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header ?? '')?.at(1) ?? 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
