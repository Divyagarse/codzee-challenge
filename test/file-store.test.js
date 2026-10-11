import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileTaskStore } from '../src/file-store.js';

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
  const task = store.create({ title: 'Persist me' });
  await store.flush();

  const reopened = await FileTaskStore.open(file);
  assert.equal(reopened.get(task.id).title, 'Persist me');
});

test('persists updates and deletes', async () => {
  const store = await FileTaskStore.open(file);
  const a = store.create({ title: 'A' });
  const b = store.create({ title: 'B' });
  store.update(a.id, { status: 'done' });
  store.delete(b.id);
  await store.flush();

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
