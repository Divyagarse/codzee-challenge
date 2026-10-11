import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

const server = createApp();
server.listen(PORT, () => {
  console.log(`taskflow-api listening on http://localhost:${PORT}`);
});
