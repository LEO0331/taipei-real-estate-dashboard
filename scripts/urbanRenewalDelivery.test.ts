import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('service worker installs the Pages snapshot and revalidates cached evidence before offline fallback', async () => {
  const handlers = new Map<string, (event: any) => void>();
  const cache = new Map<string, Response>();
  let installedPaths: string[] = [];
  let failNetwork = false;
  const origin = 'https://example.test';
  const path = `${origin}/taipei-real-estate-dashboard/data/urban-renewal-decision/snapshot.json`;
  const key = (request: string | Request) => typeof request === 'string' ? request : request.url;
  runInNewContext(await readFile('public/sw.js', 'utf8'), {
    URL, Response,
    self: { location: { origin }, addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler), skipWaiting: () => {}, clients: { claim: () => {} } },
    caches: {
      open: async () => ({
        addAll: async (paths: string[]) => { installedPaths = paths; },
        put: async (request: Request, response: Response) => { cache.set(key(request), response); },
      }),
      match: async (request: Request) => cache.get(key(request))?.clone(),
      keys: async () => [], delete: async () => true,
    },
    fetch: async () => { if (failNetwork) throw new Error('offline'); return new Response('{"snapshotId":"new-version"}', { status: 200 }); },
  });
  let installation: Promise<void> | undefined;
  handlers.get('install')!({ waitUntil: (promise: Promise<void>) => { installation = promise; } });
  await installation;
  assert.ok(installedPaths.includes('./data/urban-renewal-decision/snapshot.json'));
  cache.set(path, new Response('{"snapshotId":"old-version"}'));
  const fetchSnapshot = async () => {
    let response: Promise<Response> | undefined;
    handlers.get('fetch')!({ request: new Request(path), respondWith: (promise: Promise<Response>) => { response = promise; } });
    assert.ok(response);
    return (await response).json();
  };
  assert.deepEqual(await fetchSnapshot(), { snapshotId: 'new-version' });
  failNetwork = true;
  assert.deepEqual(await fetchSnapshot(), { snapshotId: 'new-version' });
});
