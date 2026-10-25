import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createServer } = require('../serve-web');

let root: string;
let outside: string;
let server: http.Server;
let base: string;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'paisa-serve-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'paisa-outside-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html>shell</html>');
  fs.writeFileSync(path.join(root, 'sw.js'), 'worker');
  fs.mkdirSync(path.join(root, '_expo/static/js'), { recursive: true });
  fs.writeFileSync(path.join(root, '_expo/static/js/entry-abc.js'), 'bundle');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'top secret');

  server = createServer({ root });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** jest-expo mocks global fetch, so talk HTTP directly. */
function get(url: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }));
      })
      .on('error', reject);
  });
}

function rawRequest(line: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect((server.address() as net.AddressInfo).port, '127.0.0.1', () => {
      socket.write(`${line}\r\nHost: x\r\nConnection: close\r\n\r\n`);
    });
    let data = '';
    socket.on('data', (chunk) => (data += chunk));
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
  });
}

describe('serve-web', () => {
  it('answers a malformed request URL with 400 and keeps serving', async () => {
    const reply = await rawRequest('GET http://[::1 HTTP/1.1');
    expect(reply).toMatch(/^HTTP\/1\.1 400/);
    const res = await get(`${base}/`);
    expect(res.status).toBe(200);
  });

  it('refuses a symlink that points outside the build directory', async () => {
    fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'leak.txt'));
    const res = await get(`${base}/leak.txt`);
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('top secret');
  });

  it('labels the shell no-cache wherever it is served from, even under /_expo/static/', async () => {
    for (const url of ['/_expo/static/nope', '/_expo/static/js/', '/activity']) {
      const res = await get(`${base}${url}`);
      expect(res.text).toBe('<html>shell</html>');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('labels a file by what it is, not by the path used to reach it', async () => {
    const res = await get(`${base}/_expo/static/..%2f..%2fsw.js`);
    expect(res.text).toBe('worker');
    expect(res.headers['cache-control']).toBe('no-cache');

    const bundle = await get(`${base}/_expo/static/js/entry-abc.js`);
    expect(bundle.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('returns 404 instead of crashing when the shell is missing', async () => {
    fs.rmSync(path.join(root, 'index.html'));
    const res = await get(`${base}/activity`);
    expect(res.status).toBe(404);
    expect((await get(`${base}/sw.js`)).status).toBe(200);
  });
});
