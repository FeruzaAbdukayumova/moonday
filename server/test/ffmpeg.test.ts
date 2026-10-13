import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mediaFormat, untrustedInput } from '../src/ffmpeg.ts';

const head = (...bytes: (number | string)[]) =>
  Uint8Array.from(bytes.flatMap((b) => (typeof b === 'string' ? [...b].map((c) => c.charCodeAt(0)) : [b])));

const MP4 = head(0, 0, 0, 0x20, 'ftypisom');
const MKV = head(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0);
const JPEG = head(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0);
const PNG = head(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a);
const GIF = head('GIF89a', 0, 0);

describe('mediaFormat', () => {
  it('recognises videos by their bytes', () => {
    assert.equal(mediaFormat('video', MP4), 'mov');
    assert.equal(mediaFormat('video', MKV), 'matroska');
  });

  it('recognises photos, including HEIC in an ISO container', () => {
    assert.equal(mediaFormat('photo', JPEG), 'jpeg_pipe');
    assert.equal(mediaFormat('photo', PNG), 'png_pipe');
    assert.equal(mediaFormat('photo', MP4), 'mov');
  });

  it('rejects a format the moment kind does not accept', () => {
    assert.equal(mediaFormat('video', JPEG), null);
    assert.equal(mediaFormat('photo', MKV), null);
  });

  it('rejects anything it does not recognise, whatever the client claims', () => {
    assert.equal(mediaFormat('photo', GIF), null);
    assert.equal(mediaFormat('video', head('#EXTM3U\n')), null);
    assert.equal(mediaFormat('photo', new Uint8Array()), null);
  });
});

describe('untrustedInput', () => {
  it('pins the demuxer and allows local files only', () => {
    assert.deepEqual(untrustedInput('/tmp/x', 'png_pipe'), [
      '-protocol_whitelist', 'file', '-f', 'png_pipe', '-i', '/tmp/x',
    ]);
  });
});
