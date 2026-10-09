import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

import type { Moment } from '@/lib/db';
import { formatClock } from '@/lib/day';

const RENDER_PORT = 4000;
const POLL_MS = 1000;

export type FilmPhase =
  | { name: 'uploading' }
  | { name: 'rendering'; progress: number }
  | { name: 'downloading' };

type ManifestMoment = { kind: Moment['kind']; clock: string; text?: string | null; file?: string };

type JobResponse = {
  id: string;
  status: 'rendering' | 'done' | 'failed';
  progress: number;
  error?: string;
  url?: string;
};

/**
 * During development the render service runs on the same Mac as the Expo dev
 * server, so reuse that host. EXPO_PUBLIC_RENDER_URL overrides it once the
 * service lives somewhere real.
 */
export function renderServiceUrl(): string | null {
  if (process.env.EXPO_PUBLIC_RENDER_URL) return process.env.EXPO_PUBLIC_RENDER_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${RENDER_PORT}` : null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJob(response: Response): Promise<JobResponse> {
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
  return body as JobResponse;
}

/**
 * Uploads a day's moments, waits for the film and saves it on the phone.
 * Resolves with the local file uri. `isCancelled` lets a closed screen stop polling.
 */
export async function makeFilm(
  day: string,
  moments: Moment[],
  onPhase: (phase: FilmPhase) => void,
  isCancelled: () => boolean
): Promise<string | null> {
  const base = renderServiceUrl();
  if (!base) throw new Error('render service address unknown');

  const form = new FormData();
  const manifest = moments.flatMap((moment, index): ManifestMoment[] => {
    const clock = formatClock(moment.captured_at);
    if (moment.kind === 'text') return [{ kind: 'text', clock, text: moment.text }];
    if (!moment.uri) return [];

    const field = `m${index}`;
    form.append(field, new File(moment.uri));
    return [{ kind: moment.kind, clock, file: field }];
  });
  form.append('manifest', JSON.stringify({ day, moments: manifest }));

  onPhase({ name: 'uploading' });
  let job = await readJob(await fetch(`${base}/films`, { method: 'POST', body: form }));

  while (job.status === 'rendering') {
    if (isCancelled()) return null;
    onPhase({ name: 'rendering', progress: job.progress });
    await wait(POLL_MS);
    job = await readJob(await fetch(`${base}/films/${job.id}`));
  }
  if (job.status === 'failed' || !job.url) throw new Error(job.error ?? 'render failed');
  if (isCancelled()) return null;

  onPhase({ name: 'downloading' });
  const dir = new Directory(Paths.document, 'films');
  if (!dir.exists) dir.create({ intermediates: true });
  const destination = new File(dir, `${day}.mp4`);
  if (destination.exists) destination.delete();

  const film = await File.downloadFileAsync(`${base}${job.url}`, destination);
  return film.uri;
}
