export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

export const MAX_BODY_BYTES = 1024 * 1024;

export async function readJson(req, { limit = MAX_BODY_BYTES } = {}) {
  const contentType = req.headers['content-type'] ?? '';
  if (req.headers['content-length'] !== '0' && contentType && !contentType.startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      throw new HttpError(413, `Request body exceeds ${limit} bytes`);
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}
