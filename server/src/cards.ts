import { createRequire } from 'node:module';

import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';

import { FILM_HEIGHT, FILM_WIDTH } from './ffmpeg.ts';

// Palette B from the app (src/theme.ts): pastel stickers outlined in plum ink.
const colors = {
  bg: '#FDF7FB',
  ink: '#2F2A45',
  card: '#FFFFFF',
  pink: '#F4B3CB',
  lilac: '#D6C8F2',
  sky: '#C4E1F6',
  mint: '#C8EEDC',
  butter: '#FFF0B8',
  night: '#25213A',
};

/** Text cards cycle through these so a run of them doesn't blur together. */
const CARD_BACKGROUNDS = [colors.sky, colors.mint, colors.lilac, colors.butter, colors.pink];

// Fonts ship with npm packages so the server renders identically on any machine.
const require = createRequire(import.meta.url);
GlobalFonts.registerFromPath(
  require.resolve('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
  'Bricolage'
);
GlobalFonts.registerFromPath(
  require.resolve('@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf'),
  'Figtree'
);

const DISPLAY = (size: number) => `800 ${size}px Bricolage`;
const BODY = (size: number) => `700 ${size}px Figtree`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Keeps the badge clear of the Instagram/Telegram story header. */
const SAFE_TOP = 220;
const SIDE = 72;
const OUTLINE = 7;
const SHADOW = 12;

function frame(background?: string) {
  const canvas = createCanvas(FILM_WIDTH, FILM_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, FILM_WIDTH, FILM_HEIGHT);
  }
  return { canvas, ctx };
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

/** The app's sticker look: flat ink shadow, ink outline, solid fill. */
function sticker(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  shadow = SHADOW
) {
  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.roundRect(x, y + shadow, width, height, radius);
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
}

/** A pill with centred text; returns its width so pills can sit in a row. */
function pill(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  text: string,
  fill: string,
  font = DISPLAY(46)
): number {
  ctx.font = font;
  const height = 86;
  const width = ctx.measureText(text).width + 64;
  sticker(ctx, x, y, width, height, height / 2, fill, 8);
  ctx.fillStyle = colors.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2 + 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return width;
}

/** Moonie at full moon: the same face the app shows when the film is ready. */
function moon(ctx: SKRSContext2D, cx: number, cy: number, r: number, glow = 0.45) {
  ctx.fillStyle = `rgba(255, 240, 184, ${glow})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.butter;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(47, 42, 69, 0.08)';
  for (const [dx, dy, cr] of [[-0.42, -0.38, 0.13], [0.45, -0.1, 0.09], [0.3, 0.5, 0.11]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.ink;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.3, cy - r * 0.05, r * 0.07, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = colors.pink;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.52, cy + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = OUTLINE * 0.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.14, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

/** Opening card: Moonie, the date, and whose day it is. `day` is the app's YYYY-MM-DD key. */
export function titleCard(day: string, name = ''): Buffer {
  const [year, month, date] = day.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, date).getDay()];
  const { canvas, ctx } = frame(colors.lilac);

  moon(ctx, FILM_WIDTH / 2, 640, 220);

  ctx.textAlign = 'center';
  ctx.fillStyle = colors.ink;
  ctx.font = DISPLAY(150);
  ctx.fillText(weekday, FILM_WIDTH / 2, 1120);
  ctx.font = DISPLAY(84);
  ctx.fillText(`${MONTHS[month - 1]} ${date}`, FILM_WIDTH / 2, 1230);

  if (name) {
    ctx.font = DISPLAY(52);
    const label = `${possessive(name)} day`;
    const width = ctx.measureText(label).width + 64;
    pill(ctx, (FILM_WIDTH - width) / 2, 1320, label, colors.pink, DISPLAY(52));
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = colors.ink;
  ctx.font = BODY(36);
  ctx.fillText('made with moonie', FILM_WIDTH / 2, FILM_HEIGHT - 170);

  return canvas.toBuffer('image/png');
}

/** A text moment becomes a sticker note with its time (and vibe) above it. */
export function textCard(text: string, clock: string, vibe: string | null = null, index = 0): Buffer {
  const { canvas, ctx } = frame(CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]);

  ctx.font = DISPLAY(72);
  const lineHeight = 92;
  const padding = 64;
  const width = FILM_WIDTH - SIDE * 2;
  const lines = wrap(ctx, text, width - padding * 2);
  const height = lines.length * lineHeight + padding * 2 - 20;
  const top = (FILM_HEIGHT - height) / 2;

  // A slight tilt, like a note stuck on the fridge.
  ctx.save();
  ctx.translate(FILM_WIDTH / 2, FILM_HEIGHT / 2);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.translate(-FILM_WIDTH / 2, -FILM_HEIGHT / 2);
  sticker(ctx, SIDE, top, width, height, 56, colors.card);
  ctx.fillStyle = colors.ink;
  ctx.font = DISPLAY(72);
  let y = top + padding + 62;
  for (const line of lines) {
    ctx.fillText(line, SIDE + padding, y);
    y += lineHeight;
  }
  ctx.restore();

  const row = top - 150;
  const clockWidth = pill(ctx, SIDE, row, clock, colors.pink);
  if (vibe) pill(ctx, SIDE + clockWidth + 20, row, vibe, colors.butter, BODY(42));

  return canvas.toBuffer('image/png');
}

/** Transparent full-frame overlay carrying the time (and vibe) pills for video and photo moments. */
export function clockBadge(clock: string, vibe: string | null = null): Buffer {
  const { canvas, ctx } = frame();
  const clockWidth = pill(ctx, SIDE - 20, SAFE_TOP, clock, colors.card);
  if (vibe) pill(ctx, SIDE + clockWidth, SAFE_TOP, vibe, colors.butter, BODY(42));
  return canvas.toBuffer('image/png');
}

/** Closing card: the moon is full, see you tomorrow. */
export function endCard(name = '', momentCount = 0): Buffer {
  const { canvas, ctx } = frame(colors.night);

  for (const [x, y, r] of [[160, 300, 6], [880, 420, 8], [260, 1500, 5], [930, 1380, 6], [620, 220, 4]]) {
    ctx.fillStyle = colors.butter;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  moon(ctx, FILM_WIDTH / 2, 760, 190, 0.14);

  ctx.textAlign = 'center';
  ctx.fillStyle = colors.butter;
  ctx.font = DISPLAY(120);
  ctx.fillText('Full moon.', FILM_WIDTH / 2, 1170);
  ctx.fillStyle = colors.bg;
  ctx.font = DISPLAY(60);
  ctx.fillText(name ? `Good night, ${name}` : 'Good night', FILM_WIDTH / 2, 1270);
  if (momentCount > 0) {
    ctx.font = BODY(40);
    ctx.fillText(`${momentCount} ${momentCount === 1 ? 'moment' : 'moments'} today`, FILM_WIDTH / 2, 1350);
  }

  return canvas.toBuffer('image/png');
}
