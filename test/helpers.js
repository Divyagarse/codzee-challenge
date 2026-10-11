import { createApp } from '../src/app.js';

export async function startServer(options) {
  const server = createApp(options);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return {
    request,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
