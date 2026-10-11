import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
import { FileTaskStore } from '../src/file-store.js';
import { startServer } from './helpers.js';

let dir;
let file;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'taskflow-'));
  file = path.join(dir, 'nested', 'tasks.json');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

test('starts empty when the data file does not exist', async () => {
  const store = await FileTaskStore.open(file);
  assert.deepEqual(store.list(), []);
});

test('persists created tasks and reloads them', async () => {
  const store = await FileTaskStore.open(file);
  const task = await store.create({ title: 'Persist me' });

  const reopened = await FileTaskStore.open(file);
  assert.equal(reopened.get(task.id).title, 'Persist me');
});

test('persists updates and deletes', async () => {
  const store = await FileTaskStore.open(file);
  const a = await store.create({ title: 'A' });
  const b = await store.create({ title: 'B' });
  await store.update(a.id, { status: 'done' });
  await store.delete(b.id);

  const reopened = await FileTaskStore.open(file);
  assert.equal(reopened.list().length, 1);
  assert.equal(reopened.get(a.id).status, 'done');
});

test('rejects a corrupt data file instead of silently discarding it', async () => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, '{not json');
  await assert.rejects(FileTaskStore.open(file), SyntaxError);
});

test('many rapid writes all land and leave no temp files behind', async () => {
  const store = await FileTaskStore.open(file);
  for (let i = 0; i < 50; i++) store.create({ title: `Task ${i}` });
  await store.flush();

  const reopened = await FileTaskStore.open(file);
  assert.equal(reopened.list().length, 50);
  assert.deepEqual(await fs.readdir(path.dirname(file)), ['tasks.json']);
});

test('a failed write rejects and rolls back the in-memory change', async () => {
  const store = await FileTaskStore.open(file);
  const kept = await store.create({ title: 'Kept' });
  store.writeFile = async () => { throw new Error('disk full'); };

  await assert.rejects(store.create({ title: 'Lost' }), /disk full/);
  await assert.rejects(store.update(kept.id, { status: 'done' }), /disk full/);
  await assert.rejects(store.delete(kept.id), /disk full/);
  assert.deepEqual(store.list().map((t) => [t.title, t.status]), [['Kept', 'todo']]);
});

test('the API returns 500 instead of success when a write fails', async () => {
  const store = await FileTaskStore.open(file);
  store.writeFile = async () => { throw new Error('read-only file system'); };
  const app = await startServer({ store });
  try {
    const res = await app.request('POST', '/tasks', { title: 'Not saved' });
    assert.equal(res.status, 500);
    assert.deepEqual((await app.request('GET', '/tasks')).body.data, []);
  } finally {
    await app.close();
  }
});

test('a failed rename leaves no temp file behind', async () => {
  const store = await FileTaskStore.open(file);
  await store.create({ title: 'First' });
  // Replacing the data file with a non-empty directory makes rename fail.
  await fs.rm(file);
  await fs.mkdir(path.join(file, 'blocker'), { recursive: true });
  await assert.rejects(store.create({ title: 'Second' }));
  assert.deepEqual((await fs.readdir(path.dirname(file))).sort(), ['tasks.json']);
});

test('a failed delete keeps the task in its original position', async () => {
  const store = await FileTaskStore.open(file);
  for (const title of ['A', 'B', 'C']) await store.create({ title });
  const [, b] = store.list();
  store.writeFile = async () => { throw new Error('disk full'); };
  await assert.rejects(store.delete(b.id), /disk full/);
  assert.deepEqual(store.list().map((t) => t.title), ['A', 'B', 'C']);
});

test('a change whose write fails is never saved by an earlier write', async () => {
  const store = await FileTaskStore.open(file);
  const realWrite = store.writeFile.bind(store);
  let calls = 0;
  store.writeFile = async () => {
    if (++calls === 2) throw new Error('disk full');
    return realWrite();
  };
  const first = store.create({ title: 'Saved' });
  const second = store.create({ title: 'Rolled back' });
  await first;
  await assert.rejects(second, /disk full/);

  const reopened = await FileTaskStore.open(file);
  assert.deepEqual(reopened.list().map((t) => t.title), ['Saved']);
});

test('SIGTERM lets an in-flight write finish before exiting', async () => {
  const child = spawn(process.execPath, ['src/index.js'], {
    env: { ...process.env, PORT: '0', DATA_FILE: file },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    const [line] = await once(child.stdout, 'data');
    const port = Number(String(line).match(/:(\d+) /)[1]);

    // Send only the headers and wait for the server's 100 Continue, which
    // proves it has accepted the request; then signal it and send the body,
    // so the request and its write are in flight during shutdown.
    const body = JSON.stringify({ title: 'In flight at shutdown' });
    const req = http.request({
      host: '127.0.0.1',
      port,
      method: 'POST',
      path: '/tasks',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Expect: '100-continue',
      },
    });
    const response = once(req, 'response');
    req.flushHeaders();
    await once(req, 'continue');

    child.kill('SIGTERM');
    await once(child.stdout, 'data'); // "SIGTERM received, shutting down"
    req.end(body);

    const [res] = await response;
    assert.equal(res.statusCode, 201);
    res.resume();
    const [code] = await once(child, 'exit');
    assert.equal(code, 0);
  } finally {
    child.kill();
  }

  const reopened = await FileTaskStore.open(file);
  assert.deepEqual(reopened.list().map((t) => t.title), ['In flight at shutdown']);
});
