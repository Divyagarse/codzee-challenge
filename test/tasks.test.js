import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let app;
before(async () => { app = await startServer(); });
after(async () => { await app.close(); });

test('GET /health returns ok', async () => {
  const res = await app.request('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('creates, reads, updates and deletes a task', async () => {
  const created = await app.request('POST', '/tasks', { title: 'Write docs' });
  assert.equal(created.status, 201);
  const { id } = created.body.data;

  const fetched = await app.request('GET', `/tasks/${id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.title, 'Write docs');

  const updated = await app.request('PATCH', `/tasks/${id}`, { status: 'done' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.status, 'done');

  const deleted = await app.request('DELETE', `/tasks/${id}`);
  assert.equal(deleted.status, 204);

  const missing = await app.request('GET', `/tasks/${id}`);
  assert.equal(missing.status, 404);
});

test('rejects a task without a title', async () => {
  const res = await app.request('POST', '/tasks', { description: 'no title' });
  assert.equal(res.status, 400);
});

test('rejects malformed JSON', async () => {
  const res = await app.request('POST', '/tasks', '{not json');
  assert.equal(res.status, 400);
});

test('unknown routes return 404', async () => {
  const res = await app.request('GET', '/nope');
  assert.equal(res.status, 404);
});
