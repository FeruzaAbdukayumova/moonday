import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { mediaFormat } from './ffmpeg.ts';
import { renderFilm, type FilmMoment } from './render.ts';

const PORT = Number(process.env.PORT ?? 4000);
const DATA_DIR = process.env.DATA_DIR ?? join(import.meta.dirname, '..', 'data');
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024;
const MAX_MOMENTS = 60;
const KEEP_FILMS_MS = 24 * 60 * 60 * 1000;

type Job = {
  id: string;
  status: 'rendering' | 'done' | 'failed';
  progress: number;
  error?: string;
  createdAt: number;
};

// In memory on purpose: a restart loses at most the films rendering right now,
// and the app simply asks again.
const jobs = new Map<string, Job>();

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function publicJob(job: Job) {
  return {
    id: job.id,
    status: job.status,
    progress: Math.round(job.progress * 100) / 100,
    error: job.error,
    url: job.status === 'done' ? `/films/${job.id}/film.mp4` : undefined,
  };
}

type Manifest = {
  day: string;
  moments: { kind: string; clock: string; text?: string; file?: string }[];
};

function parseManifest(raw: unknown): Manifest {
  const manifest = JSON.parse(String(raw ?? '')) as Manifest;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest?.day)) throw new Error('manifest.day must be YYYY-MM-DD');
  if (!Array.isArray(manifest.moments) || manifest.moments.length === 0) {
    throw new Error('manifest.moments must be a non-empty array');
  }
  if (manifest.moments.length > MAX_MOMENTS) throw new Error(`at most ${MAX_MOMENTS} moments`);
  return manifest;
}

async function createFilm(req: IncomingMessage, res: ServerResponse) {
  if (Number(req.headers['content-length'] ?? 0) > MAX_UPLOAD_BYTES) {
    return send(res, 413, { error: 'upload too large' });
  }

  // Content-Length is only a promise (and absent on chunked uploads), so count the
  // bytes as they arrive too; formData() buffers everything in memory.
  let received = 0;
  let tooLarge = false;
  const body = (Readable.toWeb(req) as ReadableStream<Uint8Array>).pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_UPLOAD_BYTES) {
          tooLarge = true;
          controller.error(new Error('upload too large'));
        } else controller.enqueue(chunk);
      },
    })
  );

  // Node's built-in Request parses multipart for us, no upload library needed.
  const request = new Request(`http://localhost${req.url}`, {
    method: 'POST',
    headers: req.headers as Record<string, string>,
    body,
    duplex: 'half',
  } as RequestInit);

  let form: FormData;
  let manifest: Manifest;
  try {
    form = await request.formData();
    manifest = parseManifest(form.get('manifest'));
  } catch (error) {
    if (tooLarge) {
      res.setHeader('Connection', 'close');
      return send(res, 413, { error: 'upload too large' });
    }
    return send(res, 400, { error: (error as Error).message });
  }

  const id = randomUUID();
  const dir = join(DATA_DIR, id);
  const inputs = join(dir, 'inputs');
  await mkdir(inputs, { recursive: true });

  const moments: FilmMoment[] = [];
  for (const [index, m] of manifest.moments.entries()) {
    const clock = String(m.clock ?? '').slice(0, 5);
    if (m.kind === 'text') {
      if (m.text?.trim()) moments.push({ kind: 'text', clock, text: m.text.slice(0, 280) });
      continue;
    }
    if (m.kind !== 'video' && m.kind !== 'photo') continue;

    const upload = m.file ? form.get(m.file) : null;
    if (!(upload instanceof File)) continue;
    const bytes = Buffer.from(await upload.arrayBuffer());
    const format = mediaFormat(m.kind, bytes.subarray(0, 16));
    if (!format) continue;
    const path = join(inputs, String(index).padStart(3, '0'));
    await writeFile(path, bytes);
    moments.push({ kind: m.kind, clock, path, format });
  }

  if (moments.length === 0) {
    await rm(dir, { recursive: true, force: true });
    return send(res, 400, { error: 'no usable moments' });
  }

  const job: Job = { id, status: 'rendering', progress: 0, createdAt: Date.now() };
  jobs.set(id, job);
  send(res, 202, publicJob(job));

  const started = Date.now();
  renderFilm({ day: manifest.day, moments }, dir, join(dir, 'film.mp4'), (p) => (job.progress = p))
    .then(() => {
      job.status = 'done';
      console.log(`film ${id}: ${moments.length} moments in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    })
    .catch((error: Error) => {
      job.status = 'failed';
      job.error = error.message;
      console.error(`film ${id} failed:`, error.message);
    })
    .finally(async () => {
      // Keep only the film; segments and uploads are just scratch.
      for (const name of await readdir(dir)) {
        if (name !== 'film.mp4') await rm(join(dir, name), { recursive: true, force: true });
      }
    });
}

async function streamFilm(res: ServerResponse, job: Job) {
  const path = join(DATA_DIR, job.id, 'film.mp4');
  const { size } = await stat(path);
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size });
  createReadStream(path).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const [, resource, id, file] = url.pathname.split('/');

  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

    if (resource === 'films') {
      if (req.method === 'POST' && !id) return await createFilm(req, res);

      const job = id ? jobs.get(id) : undefined;
      if (req.method === 'GET' && job && !file) return send(res, 200, publicJob(job));
      if (req.method === 'GET' && job?.status === 'done' && file === 'film.mp4') {
        return await streamFilm(res, job);
      }
    }

    send(res, 404, { error: 'not found' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(res, 500, { error: 'internal error' });
  }
});

setInterval(async () => {
  for (const job of jobs.values()) {
    if (job.status !== 'rendering' && Date.now() - job.createdAt > KEEP_FILMS_MS) {
      jobs.delete(job.id);
      await rm(join(DATA_DIR, job.id), { recursive: true, force: true });
    }
  }
}, 60 * 60 * 1000).unref();

// Films from a previous run have no job entry anymore, so nobody can fetch them.
await rm(DATA_DIR, { recursive: true, force: true });
await mkdir(DATA_DIR, { recursive: true });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`bugun render service on :${PORT}`);
});
