/**
 * Minimal path router supporting `:param` segments.
 */
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const keys = [];
    const regex = new RegExp(
      '^' +
        pattern.replace(/:([a-zA-Z]+)/g, (_, key) => {
          keys.push(key);
          return '([^/]+)';
        }) +
        '/?$'
    );
    this.routes.push({ method, regex, keys, handler });
  }

  get(pattern, handler) { this.add('GET', pattern, handler); }
  post(pattern, handler) { this.add('POST', pattern, handler); }
  patch(pattern, handler) { this.add('PATCH', pattern, handler); }
  delete(pattern, handler) { this.add('DELETE', pattern, handler); }

  async handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.regex.exec(url.pathname);
      if (!match) continue;
      req.params = Object.fromEntries(
        route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])
      );
      req.query = url.searchParams;
      await route.handler(req, res);
      return true;
    }
    return false;
  }
}
