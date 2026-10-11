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

test('sorts by priority rank, not alphabetically', async () => {
  const asc = await app.request('GET', '/tasks?sort=priority');
  assert.deepEqual(asc.body.data.map((t) => t.priority), ['low', 'medium', 'high', 'high']);
  const desc = await app.request('GET', '/tasks?sort=-priority');
  assert.deepEqual(desc.body.data.map((t) => t.priority), ['high', 'high', 'medium', 'low']);
});

test('sorts titles case-insensitively', async () => {
  await app.request('POST', '/tasks', { title: 'apple pie' });
  const res = await app.request('GET', '/tasks?sort=title&limit=2');
  assert.deepEqual(res.body.data.map((t) => t.title), ['apple pie', 'Fix login bug']);
  const created = (await app.request('GET', '/tasks?q=apple pie')).body.data[0];
  await app.request('DELETE', `/tasks/${created.id}`);
});

for (const param of ['limit=-1', 'offset=-1', 'limit=10abc', 'limit=1.5']) {
  test(`rejects ${param}`, async () => {
    const res = await app.request('GET', `/tasks?${param}`);
    assert.equal(res.status, 400);
  });
}

test('search tolerates a null description', async () => {
  const created = await app.request('POST', '/tasks', { title: 'No details', description: null });
  const res = await app.request('GET', '/tasks?q=report');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((t) => t.title).sort(), ['Fix login bug', 'Write quarterly report']);
  await app.request('DELETE', `/tasks/${created.body.data.id}`);
});

test('unknown priorities like "toString" sort first without scrambling the rest', async () => {
  const created = await app.request('POST', '/tasks', { title: 'Odd', priority: 'toString' });
  const res = await app.request('GET', '/tasks?sort=priority');
  assert.deepEqual(res.body.data.map((t) => t.priority), ['toString', 'low', 'medium', 'high', 'high']);
  await app.request('DELETE', `/tasks/${created.body.data.id}`);
});
