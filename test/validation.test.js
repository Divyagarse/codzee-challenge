import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let app;
before(async () => { app = await startServer(); });
after(async () => { await app.close(); });

async function createTask(body = { title: 'Task' }) {
  const res = await app.request('POST', '/tasks', body);
  assert.equal(res.status, 201);
  return res.body.data;
}

test('trims the title and applies defaults on create', async () => {
  const task = await createTask({ title: '  Plan sprint  ' });
  assert.equal(task.title, 'Plan sprint');
  assert.equal(task.status, 'todo');
  assert.equal(task.priority, 'medium');
});

for (const [name, body] of [
  ['blank title', { title: '   ' }],
  ['non-string title', { title: 42 }],
  ['overlong title', { title: 'x'.repeat(201) }],
  ['invalid status', { title: 'a', status: 'blocked' }],
  ['invalid priority', { title: 'a', priority: 'urgent' }],
  ['unknown field', { title: 'a', owner: 'me' }],
  ['array body', [{ title: 'a' }]],
]) {
  test(`rejects create with ${name}`, async () => {
    const res = await app.request('POST', '/tasks', body);
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
}

test('PATCH cannot overwrite id or timestamps', async () => {
  const task = await createTask();
  const res = await app.request('PATCH', `/tasks/${task.id}`, { id: 'hijack' });
  assert.equal(res.status, 400);
});

test('PATCH with an empty body is rejected', async () => {
  const task = await createTask();
  const res = await app.request('PATCH', `/tasks/${task.id}`, {});
  assert.equal(res.status, 400);
});

test('PATCH on a missing task returns 404 before validating', async () => {
  const res = await app.request('PATCH', '/tasks/does-not-exist', { status: 'nope' });
  assert.equal(res.status, 404);
});

test('rejects bodies larger than 1 MiB', async () => {
  const res = await app.request('POST', '/tasks', { title: 'a', description: 'x'.repeat(1024 * 1024) });
  assert.equal(res.status, 413);
});
