import { createApp } from './app.js';
import { TaskStore } from './store.js';
import { FileTaskStore } from './file-store.js';

// PORT=0 is valid (an ephemeral port), so only fall back when PORT is unset.
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATA_FILE = process.env.DATA_FILE;

const store = DATA_FILE ? await FileTaskStore.open(DATA_FILE) : new TaskStore();

const server = createApp({ store });
server.listen(PORT, () => {
  const mode = DATA_FILE ? `persisting to ${DATA_FILE}` : 'in-memory';
  console.log(`taskflow-api listening on http://localhost:${server.address().port} (${mode})`);
});

// On shutdown, stop accepting connections and let in-flight requests finish.
// Mutating requests only respond once their write is on disk; the flush is a
// safeguard for any write still queued after the last response.
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
