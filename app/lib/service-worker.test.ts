// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test, expect, vi } from 'vitest';

type Handler = (event: Record<string, unknown>) => void;

function loadWorker(cacheNames: string[] = []) {
  const handlers: Record<string, Handler> = {};
  const offlinePage = new Response('offline page');
  const cache = { add: vi.fn(async () => {}) };
  const cachesApi = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => cacheNames),
    delete: vi.fn(async () => true),
    match: vi.fn(async () => offlinePage),
  };
  const fetchMock = vi.fn<(request: unknown) => Promise<Response>>();
  const self = {
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  const source = readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');
  new Function('self', 'caches', 'fetch', source)(self, cachesApi, fetchMock);
  return { handlers, cache, cachesApi, fetchMock, self, offlinePage };
}

async function runLifecycle(handler: Handler) {
  let work: Promise<unknown> = Promise.resolve();
  handler({ waitUntil: (promise: Promise<unknown>) => (work = promise) });
  await work;
}

function runFetch(handler: Handler, mode: string) {
  const request = { mode };
  let response: Promise<Response> | undefined;
  handler({ request, respondWith: (value: Promise<Response>) => (response = value) });
  return { request, response };
}

describe('service worker offline support', () => {
  test('install caches only the offline page, then activates', async () => {
    const { handlers, cache, cachesApi, self } = loadWorker();
    await runLifecycle(handlers.install);
    expect(cachesApi.open).toHaveBeenCalledWith('klivr-offline-v1');
    expect(cache.add).toHaveBeenCalledOnce();
    expect(cache.add).toHaveBeenCalledWith('/offline.html');
    expect(self.skipWaiting).toHaveBeenCalledOnce();
  });

  test('install does not activate if the offline page cannot be cached', async () => {
    const { handlers, cache, self } = loadWorker();
    cache.add.mockRejectedValueOnce(new Error('network'));
    await expect(runLifecycle(handlers.install)).rejects.toThrow('network');
    expect(self.skipWaiting).not.toHaveBeenCalled();
  });

  test('activate removes older offline caches only, then claims pages', async () => {
    const { handlers, cachesApi, self } = loadWorker(['klivr-offline-v0', 'klivr-offline-v1', 'something-else']);
    await runLifecycle(handlers.activate);
    expect(cachesApi.delete).toHaveBeenCalledOnce();
    expect(cachesApi.delete).toHaveBeenCalledWith('klivr-offline-v0');
    expect(self.clients.claim).toHaveBeenCalledOnce();
  });

  test('a page load that reaches the server passes through, even an HTTP error', async () => {
    const { handlers, fetchMock, cachesApi } = loadWorker();
    const serverError = new Response('error', { status: 500 });
    fetchMock.mockResolvedValueOnce(serverError);
    const { request, response } = runFetch(handlers.fetch, 'navigate');
    await expect(response).resolves.toBe(serverError);
    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(cachesApi.match).not.toHaveBeenCalled();
  });

  test('a page load that fails on the network gets the offline page', async () => {
    const { handlers, fetchMock, cachesApi, offlinePage } = loadWorker();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { response } = runFetch(handlers.fetch, 'navigate');
    await expect(response).resolves.toBe(offlinePage);
    expect(cachesApi.match).toHaveBeenCalledWith('/offline.html');
  });

  test('other requests are left alone', () => {
    const { handlers, fetchMock } = loadWorker();
    const { response } = runFetch(handlers.fetch, 'cors');
    expect(response).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
