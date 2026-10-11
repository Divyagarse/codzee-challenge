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
