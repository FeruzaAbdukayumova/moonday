import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { createCanvas } from '@napi-rs/canvas';

const MAX_UPLOAD_MB = 1;
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

let server: ChildProcess;
let dataDir: string;
let base: string;

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  const port = await freePort();
  dataDir = await mkdtemp(join(tmpdir(), 'moonday-render-'));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(import.meta.dirname, '..', 'src', 'index.ts')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, MAX_UPLOAD_MB: String(MAX_UPLOAD_MB) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise<void>((resolve, reject) => {
    server.stdout!.on('data', (chunk: Buffer) => chunk.toString().includes('render service on') && resolve());
    server.once('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });
});

after(async () => {
  server.kill();
  await rm(dataDir, { recursive: true, force: true });
});

function filmForm(manifest: unknown, files: Record<string, Blob> = {}) {
  const form = new FormData();
  form.append('manifest', typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  for (const [field, blob] of Object.entries(files)) form.append(field, blob, field);
  return form;
}

async function postFilm(body: FormData) {
  const response = await fetch(`${base}/films`, { method: 'POST', body });
  return { status: response.status, body: await response.json() };
}

function png() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F4B3CB';
  ctx.fillRect(0, 0, 64, 64);
  return new Blob([new Uint8Array(canvas.toBuffer('image/png'))], { type: 'image/png' });
}

describe('render service', () => {
  it('answers health checks', async () => {
    const response = await fetch(`${base}/health`);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('returns 404 for unknown routes and jobs', async () => {
    assert.equal((await fetch(`${base}/nope`)).status, 404);
    assert.equal((await fetch(`${base}/films/not-a-job`)).status, 404);
  });

  describe('manifest validation', () => {
    const textMoment = { kind: 'text', clock: '9:00', text: 'hi' };

    it('rejects a manifest that is not JSON', async () => {
      const { status } = await postFilm(filmForm('{nope'));
      assert.equal(status, 400);
    });

    it('rejects a day that is not YYYY-MM-DD', async () => {
      const { status, body } = await postFilm(filmForm({ day: '13.10.2026', moments: [textMoment] }));
      assert.equal(status, 400);
      assert.match(body.error, /YYYY-MM-DD/);
    });

    it('rejects an empty day', async () => {
      const { status, body } = await postFilm(filmForm({ day: '2026-10-13', moments: [] }));
      assert.equal(status, 400);
      assert.match(body.error, /non-empty/);
    });

    it('caps the number of moments', async () => {
      const moments = Array.from({ length: 61 }, () => textMoment);
      const { status, body } = await postFilm(filmForm({ day: '2026-10-13', moments }));
      assert.equal(status, 400);
      assert.match(body.error, /at most 60/);
    });
  });

  it('ignores uploads whose bytes do not match the moment kind', async () => {
    const fakePhoto = new Blob(['<?php echo "hi"; ?>'], { type: 'image/jpeg' });
    const { status, body } = await postFilm(
      filmForm({ day: '2026-10-13', moments: [{ kind: 'photo', clock: '9:00', file: 'm0' }] }, { m0: fakePhoto })
    );
    assert.equal(status, 400);
    assert.equal(body.error, 'no usable moments');
  });

  describe('upload size cap', () => {
    const big = () => new Blob([new Uint8Array(MAX_UPLOAD_MB * 1024 * 1024 + 1)]);

    it('refuses a declared Content-Length over the cap', async () => {
      const { status } = await postFilm(filmForm({ day: '2026-10-13', moments: [] }, { m0: big() }));
      assert.equal(status, 413);
    });

    it('cuts off a chunked upload that grows past the cap', async () => {
      const encoded = new Response(filmForm({ day: '2026-10-13', moments: [] }, { m0: big() }));
      const response = await fetch(`${base}/films`, {
        method: 'POST',
        headers: { 'Content-Type': encoded.headers.get('Content-Type')! },
        body: encoded.body,
        duplex: 'half',
      } as RequestInit);
      assert.equal(response.status, 413);
    });
  });

  it('renders a film from a photo and a note', { skip: !hasFfmpeg && 'ffmpeg not installed', timeout: 120_000 }, async () => {
    const manifest = {
      day: '2026-10-13',
      name: 'Lola',
      moments: [
        { kind: 'photo', clock: '9:15', vibe: 'cozy', file: 'm0' },
        { kind: 'text', clock: '13:40', vibe: 'lol', text: 'Lunch with the girls' },
      ],
    };
    let { status, body: job } = await postFilm(filmForm(manifest, { m0: png() }));
    assert.equal(status, 202);
    assert.equal(job.status, 'rendering');

    while (job.status === 'rendering') {
      await new Promise((resolve) => setTimeout(resolve, 250));
      job = await (await fetch(`${base}/films/${job.id}`)).json();
    }
    assert.equal(job.status, 'done', job.error);
    assert.equal(job.url, `/films/${job.id}/film.mp4`);

    const film = await fetch(`${base}${job.url}`);
    assert.equal(film.headers.get('content-type'), 'video/mp4');
    const bytes = new Uint8Array(await film.arrayBuffer());
    assert.equal(String.fromCharCode(...bytes.subarray(4, 8)), 'ftyp');
  });
});
