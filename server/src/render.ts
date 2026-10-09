import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { clockBadge, endCard, textCard, titleCard } from './cards.ts';
import {
  COVER_FILTER,
  ffmpeg,
  FILM_HEIGHT,
  FILM_WIDTH,
  FPS,
  type MediaFormat,
  probe,
  SEGMENT_OUTPUT_ARGS,
  untrustedInput,
} from './ffmpeg.ts';

export const MAX_CLIP_SECONDS = 6;
const PHOTO_SECONDS = 2.5;
const TEXT_SECONDS = 3;
const TITLE_SECONDS = 2;
const END_SECONDS = 2;

export type FilmMoment =
  | { kind: 'video' | 'photo'; clock: string; vibe: string | null; path: string; format: MediaFormat }
  | { kind: 'text'; clock: string; vibe: string | null; text: string };

export type FilmRequest = { day: string; name: string; moments: FilmMoment[] };

const SILENCE = ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'];

async function stillSegment(
  image: string,
  seconds: number,
  output: string,
  options: { zoom?: boolean; badge?: string } = {}
) {
  // A slow push-in keeps photos from reading as a frozen frame. The badge goes on
  // after the zoom so the time stays put.
  const motion = options.zoom
    ? `,scale=w='2*trunc(${FILM_WIDTH / 2}*(1+0.06*t/${seconds}))':h=-2:eval=frame,crop=${FILM_WIDTH}:${FILM_HEIGHT}`
    : '';
  const overlay = options.badge ? '[still];[still][2:v]overlay=0:0' : '';
  await ffmpeg([
    '-loop', '1', '-framerate', String(FPS), '-t', String(seconds), '-i', image,
    ...SILENCE,
    ...(options.badge ? ['-i', options.badge] : []),
    '-filter_complex', `[0:v]${COVER_FILTER}${motion}${overlay},format=yuv420p[v]`,
    '-map', '[v]', '-map', '1:a', '-t', String(seconds),
    ...SEGMENT_OUTPUT_ARGS, output,
  ]);
}

async function videoSegment(input: string, format: MediaFormat, badge: string, output: string) {
  const info = await probe(input, format);
  if (!info.hasVideo) throw new Error('clip has no video stream');
  const seconds = Math.min(info.duration || MAX_CLIP_SECONDS, MAX_CLIP_SECONDS);

  await ffmpeg([
    '-t', String(seconds), ...untrustedInput(input, format),
    '-i', badge,
    ...SILENCE,
    '-filter_complex', `[0:v]fps=${FPS},${COVER_FILTER}[base];[base][1:v]overlay=0:0,format=yuv420p[v]`,
    '-map', '[v]', '-map', info.hasAudio ? '0:a:0' : '2:a',
    '-t', String(seconds),
    ...SEGMENT_OUTPUT_ARGS, output,
  ]);
}

/**
 * Turns one day's moments into a vertical MP4 at `output`.
 * Moments must already be in timeline order; the client knows the order and the local clock.
 */
export async function renderFilm(
  request: FilmRequest,
  workDir: string,
  output: string,
  onProgress: (fraction: number) => void
) {
  const segments: string[] = [];
  const total = request.moments.length + 3;
  let done = 0;
  const step = () => onProgress(++done / total);

  const title = join(workDir, 'title.png');
  await writeFile(title, titleCard(request.day, request.name));
  const titleSegment = join(workDir, 'seg-title.mp4');
  await stillSegment(title, TITLE_SECONDS, titleSegment);
  segments.push(titleSegment);
  step();

  for (const [index, moment] of request.moments.entries()) {
    const segment = join(workDir, `seg-${String(index).padStart(3, '0')}.mp4`);
    try {
      if (moment.kind === 'text') {
        const card = join(workDir, `text-${index}.png`);
        await writeFile(card, textCard(moment.text, moment.clock, moment.vibe, index));
        await stillSegment(card, TEXT_SECONDS, segment);
      } else {
        const badge = join(workDir, `badge-${index}.png`);
        await writeFile(badge, clockBadge(moment.clock, moment.vibe));
        if (moment.kind === 'video') await videoSegment(moment.path, moment.format, badge, segment);
        else {
          // Decode once to PNG: covers HEIC and applies EXIF rotation, and PNG loops cleanly.
          const still = join(workDir, `photo-${index}.png`);
          await ffmpeg([...untrustedInput(moment.path, moment.format), '-frames:v', '1', still]);
          await stillSegment(still, PHOTO_SECONDS, segment, { zoom: true, badge });
        }
      }
      segments.push(segment);
    } catch (error) {
      // One unreadable file should not cost the user their whole film.
      console.warn(`skipping moment ${index} (${moment.kind}):`, (error as Error).message);
    }
    step();
  }

  if (segments.length === 1) throw new Error('none of the moments could be rendered');

  const end = join(workDir, 'end.png');
  await writeFile(end, endCard(request.name, segments.length - 1));
  const endSegment = join(workDir, 'seg-end.mp4');
  await stillSegment(end, END_SECONDS, endSegment);
  segments.push(endSegment);
  step();

  const list = join(workDir, 'segments.txt');
  await writeFile(list, segments.map((s) => `file '${s.replaceAll("'", "'\\''")}'`).join('\n'));
  await ffmpeg(['-protocol_whitelist', 'file', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
  step();
}
