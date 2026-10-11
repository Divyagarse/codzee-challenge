import { sendJson, readJson, HttpError } from '../http.js';
import { parseListQuery, applyListQuery } from '../query.js';
import { validateCreate, validateUpdate } from '../validation.js';

export function registerTaskRoutes(router, store) {
  router.get('/tasks', (req, res) => {
    const query = parseListQuery(req.query);
    sendJson(res, 200, applyListQuery(store.list(), query));
  });

  router.get('/tasks/:id', (req, res) => {
    const task = store.get(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');
    sendJson(res, 200, { data: task });
  });

  router.post('/tasks', async (req, res) => {
    const input = validateCreate(await readJson(req));
    const task = store.create(input);
    sendJson(res, 201, { data: task });
  });

  router.patch('/tasks/:id', async (req, res) => {
    if (!store.get(req.params.id)) throw new HttpError(404, 'Task not found');
    const changes = validateUpdate(await readJson(req));
    // The task may have been deleted while the body was being read.
    const task = store.update(req.params.id, changes);
    if (!task) throw new HttpError(404, 'Task not found');
    sendJson(res, 200, { data: task });
  });

  router.delete('/tasks/:id', (req, res) => {
    const deleted = store.delete(req.params.id);
    if (!deleted) throw new HttpError(404, 'Task not found');
    res.writeHead(204);
    res.end();
  });
}
