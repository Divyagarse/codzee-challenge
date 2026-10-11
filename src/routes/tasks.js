import { sendJson, readJson, HttpError } from '../http.js';

export function registerTaskRoutes(router, store) {
  router.get('/tasks', (req, res) => {
    sendJson(res, 200, { data: store.list() });
  });

  router.get('/tasks/:id', (req, res) => {
    const task = store.get(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');
    sendJson(res, 200, { data: task });
  });

  router.post('/tasks', async (req, res) => {
    const body = await readJson(req);
    if (!body.title) throw new HttpError(400, 'title is required');
    const task = await store.create(body);
    sendJson(res, 201, { data: task });
  });

  router.patch('/tasks/:id', async (req, res) => {
    const body = await readJson(req);
    const task = await store.update(req.params.id, body);
    if (!task) throw new HttpError(404, 'Task not found');
    sendJson(res, 200, { data: task });
  });

  router.delete('/tasks/:id', async (req, res) => {
    const deleted = await store.delete(req.params.id);
    if (!deleted) throw new HttpError(404, 'Task not found');
    res.writeHead(204);
    res.end();
  });
}
