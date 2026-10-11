import http from 'node:http';
import { TaskStore } from './store.js';
import { Router } from './router.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { sendJson, HttpError } from './http.js';

export function createApp({ store = new TaskStore() } = {}) {
  const router = new Router();

  router.get('/health', (req, res) => sendJson(res, 200, { status: 'ok' }));
  registerTaskRoutes(router, store);

  return http.createServer(async (req, res) => {
    try {
      const handled = await router.handle(req, res);
      if (!handled) {
        throw new HttpError(404, 'Route not found');
      }
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'Internal server error';
      if (status === 500) console.error(err);
      sendJson(res, status, { error: message });
    }
  });
}
