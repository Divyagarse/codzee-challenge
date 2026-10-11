import { sendJson, readJson, HttpError } from '../http.js';
import { validateCreate, validateUpdate } from '../validation.js';

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
    const input = validateCreate(await readJson(req));
    const task = store.create(input);
    sendJson(res, 201, { data: task });
  });

  router.patch('/tasks/:id', async (req, res) => {
    if (!store.get(req.params.id)) throw new HttpError(404, 'Task not found');
    const changes = validateUpdate(await readJson(req));
    const task = store.update(req.params.id, changes);
    sendJson(res, 200, { data: task });
  });

  router.delete('/tasks/:id', (req, res) => {
    const deleted = store.delete(req.params.id);
    if (!deleted) throw new HttpError(404, 'Task not found');
    res.writeHead(204);
    res.end();
  });
}
