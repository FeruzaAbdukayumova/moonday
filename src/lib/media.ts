import { Directory, File, Paths } from 'expo-file-system';

const MOMENTS_DIR = 'moments';

function extensionFor(uri: string, kind: 'video' | 'photo'): string {
  const match = /\.(\w+)(?:\?|$)/.exec(uri);
  if (match) return `.${match[1]}`;
  return kind === 'video' ? '.mp4' : '.jpg';
}

/**
 * Camera and picker hand back files in the cache, which the system may clear.
 * Copy them into document storage so a day's moments survive.
 */
export async function persistMedia(tempUri: string, kind: 'video' | 'photo'): Promise<string> {
  const dir = new Directory(Paths.document, MOMENTS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensionFor(tempUri, kind)}`;
  const source = new File(tempUri);
  const destination = new File(dir, name);
  await source.copy(destination);

  return destination.uri;
}

export function deleteMedia(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is not worth interrupting the user for.
  }
}
