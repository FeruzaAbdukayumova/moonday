import { spawn } from 'node:child_process';

export const FILM_WIDTH = 1080;
export const FILM_HEIGHT = 1920;
export const FPS = 30;

/**
 * Every segment is encoded with identical settings so the final film can be
 * joined with a stream copy instead of a second, slow re-encode.
 */
export const SEGMENT_OUTPUT_ARGS = [
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-r', String(FPS), '-video_track_timescale', '30000',
  '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
];

/** Fill the vertical frame edge to edge, cropping whatever sticks out. */
export const COVER_FILTER =
  `scale=${FILM_WIDTH}:${FILM_HEIGHT}:force_original_aspect_ratio=increase,` +
  `crop=${FILM_WIDTH}:${FILM_HEIGHT},setsar=1`;

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with ${code}: ${stderr.trim().split('\n').slice(-5).join('\n')}`));
    });
  });
}

export function ffmpeg(args: string[]) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
}

/**
 * The containers phones actually produce. Uploads are sniffed into one of these and
 * the demuxer is forced, so ffmpeg never guesses: a crafted upload can't pose as an
 * HLS playlist or concat script and make ffmpeg read other files or fetch URLs.
 * The mov demuxer covers mp4/mov/3gp video and HEIC photos.
 */
export type MediaFormat = 'mov' | 'matroska' | 'jpeg_pipe' | 'png_pipe';

const FORMATS_BY_KIND = {
  video: ['mov', 'matroska'],
  photo: ['mov', 'jpeg_pipe', 'png_pipe'],
} as const satisfies Record<string, MediaFormat[]>;

function sniff(head: Uint8Array): MediaFormat | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (ascii(4, 8) === 'ftyp') return 'mov';
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'matroska';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg_pipe';
  if (head[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png_pipe';
  return null;
}

/** The forced demuxer for an upload, or null when it isn't a format this kind of moment accepts. */
export function mediaFormat(kind: keyof typeof FORMATS_BY_KIND, head: Uint8Array): MediaFormat | null {
  const format = sniff(head);
  return format && (FORMATS_BY_KIND[kind] as readonly MediaFormat[]).includes(format) ? format : null;
}

/** `-i` for a file we didn't write ourselves: local files only, demuxer pinned. */
export function untrustedInput(path: string, format: MediaFormat) {
  return ['-protocol_whitelist', 'file', '-f', format, '-i', path];
}

export type Probe = { duration: number; hasAudio: boolean; hasVideo: boolean };

export async function probe(path: string, format: MediaFormat): Promise<Probe> {
  const output = await run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams',
    '-protocol_whitelist', 'file', '-f', format, path,
  ]);
  const info = JSON.parse(output) as {
    format?: { duration?: string };
    streams?: { codec_type?: string }[];
  };
  const streams = info.streams ?? [];
  return {
    duration: Number(info.format?.duration) || 0,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    hasVideo: streams.some((s) => s.codec_type === 'video'),
  };
}
