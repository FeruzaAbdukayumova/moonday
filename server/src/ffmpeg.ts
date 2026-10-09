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

export type Probe = { duration: number; hasAudio: boolean; hasVideo: boolean };

export async function probe(path: string): Promise<Probe> {
  const output = await run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path,
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
