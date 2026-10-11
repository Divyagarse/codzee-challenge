import { createApp } from './app.js';
import { TaskStore } from './store.js';
import { FileTaskStore } from './file-store.js';

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE;

const store = DATA_FILE ? await FileTaskStore.open(DATA_FILE) : new TaskStore();

const server = createApp({ store });
server.listen(PORT, () => {
  const mode = DATA_FILE ? `persisting to ${DATA_FILE}` : 'in-memory';
  console.log(`taskflow-api listening on http://localhost:${PORT} (${mode})`);
});

// On shutdown, stop accepting connections, let in-flight requests finish and
// wait for queued writes to reach DATA_FILE before exiting.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 10_000).unref();
  await new Promise((resolve) => server.close(resolve));
  await store.flush?.();
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => shutdown(signal));
}
