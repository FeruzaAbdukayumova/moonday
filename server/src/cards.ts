import { createRequire } from 'node:module';

import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';

import { FILM_HEIGHT, FILM_WIDTH } from './ffmpeg.ts';

// Same palette as the app (src/theme.ts), so the film feels like Bugun.
const colors = {
  bg: '#0B0B0C',
  text: '#F2F2F0',
  dim: '#85858B',
  accent: '#E8C28A',
};

// Fonts ship with npm packages so the server renders identically on any machine.
const require = createRequire(import.meta.url);
GlobalFonts.registerFromPath(
  require.resolve('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  'Inter'
);
GlobalFonts.registerFromPath(
  require.resolve('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  'JetBrains Mono'
);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Keeps the badge clear of the Instagram/Telegram story header. */
const SAFE_TOP = 220;
const SIDE = 72;

function frame() {
  const canvas = createCanvas(FILM_WIDTH, FILM_HEIGHT);
  return { canvas, ctx: canvas.getContext('2d') };
}

function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Opening card: "September 16" over the weekday. `day` is the app's YYYY-MM-DD key. */
export function titleCard(day: string): Buffer {
  const [year, month, date] = day.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, date).getDay()];
  const { canvas, ctx } = frame();

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, FILM_WIDTH, FILM_HEIGHT);
  ctx.textAlign = 'center';

  ctx.fillStyle = colors.text;
  ctx.font = '600 120px Inter';
  ctx.fillText(`${MONTHS[month - 1]} ${date}`, FILM_WIDTH / 2, FILM_HEIGHT / 2);

  ctx.fillStyle = colors.accent;
  ctx.font = '500 44px "JetBrains Mono"';
  ctx.fillText(weekday, FILM_WIDTH / 2, FILM_HEIGHT / 2 + 90);

  ctx.fillStyle = colors.dim;
  ctx.font = '500 36px "JetBrains Mono"';
  ctx.fillText('bugun', FILM_WIDTH / 2, FILM_HEIGHT - 160);

  return canvas.toBuffer('image/png');
}

/** A text moment becomes a full card with its time above the words. */
export function textCard(text: string, clock: string): Buffer {
  const { canvas, ctx } = frame();

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, FILM_WIDTH, FILM_HEIGHT);

  ctx.font = '600 68px Inter';
  const lineHeight = 92;
  const lines = wrap(ctx, text, FILM_WIDTH - SIDE * 2);
  const blockHeight = lines.length * lineHeight;
  let y = (FILM_HEIGHT - blockHeight) / 2 + lineHeight * 0.75;

  ctx.fillStyle = colors.accent;
  ctx.font = '500 44px "JetBrains Mono"';
  ctx.fillText(clock, SIDE, y - lineHeight - 30);

  ctx.fillStyle = colors.text;
  ctx.font = '600 68px Inter';
  for (const line of lines) {
    ctx.fillText(line, SIDE, y);
    y += lineHeight;
  }

  return canvas.toBuffer('image/png');
}

/** Transparent full-frame overlay carrying the time pill for video and photo moments. */
export function clockBadge(clock: string): Buffer {
  const { canvas, ctx } = frame();

  ctx.font = '500 44px "JetBrains Mono"';
  const width = ctx.measureText(clock).width + 56;
  const height = 76;

  ctx.fillStyle = 'rgba(11, 11, 12, 0.62)';
  ctx.beginPath();
  ctx.roundRect(SIDE - 28, SAFE_TOP, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = colors.accent;
  ctx.textBaseline = 'middle';
  ctx.fillText(clock, SIDE, SAFE_TOP + height / 2 + 2);

  return canvas.toBuffer('image/png');
}
