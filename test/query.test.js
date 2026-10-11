import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let app;
before(async () => {
  app = await startServer();
  const seed = [
    { title: 'Write quarterly report', priority: 'high', status: 'todo' },
    { title: 'Review pull requests', priority: 'medium', status: 'in_progress' },
    { title: 'Update dependencies', priority: 'low', status: 'done' },
    { title: 'Fix login bug', priority: 'high', status: 'in_progress', description: 'Users see a blank report page' },
  ];
  for (const task of seed) {
    await app.request('POST', '/tasks', task);
  }
});
after(async () => { await app.close(); });

test('lists tasks with pagination metadata', async () => {
  const res = await app.request('GET', '/tasks');
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.total, 4);
  assert.equal(res.body.data.length, 4);
});

test('filters by status and priority', async () => {
  const res = await app.request('GET', '/tasks?status=in_progress&priority=high');
  assert.deepEqual(res.body.data.map((t) => t.title), ['Fix login bug']);
});

test('searches title and description case-insensitively', async () => {
  const res = await app.request('GET', '/tasks?q=REPORT&sort=title');
  assert.deepEqual(res.body.data.map((t) => t.title), ['Fix login bug', 'Write quarterly report']);
});

test('sorts by title ascending and descending', async () => {
  const asc = await app.request('GET', '/tasks?sort=title');
  const desc = await app.request('GET', '/tasks?sort=-title');
  assert.equal(asc.body.data[0].title, 'Fix login bug');
  assert.equal(desc.body.data[0].title, 'Write quarterly report');
});

test('paginates with limit and offset', async () => {
  const res = await app.request('GET', '/tasks?sort=title&limit=2&offset=1');
  assert.deepEqual(res.body.data.map((t) => t.title), ['Review pull requests', 'Update dependencies']);
  assert.deepEqual(res.body.meta, { total: 4, limit: 2, offset: 1 });
});

test('rejects unknown sort fields and non-numeric limits', async () => {
  assert.equal((await app.request('GET', '/tasks?sort=password')).status, 400);
  assert.equal((await app.request('GET', '/tasks?limit=abc')).status, 400);
});
