import { HttpError } from './http.js';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'priority'];
const DEFAULT_LIMIT = 20;

function parseIntParam(params, name, fallback) {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new HttpError(400, `${name} must be an integer`);
  }
  return value;
}

/**
 * Parses list query parameters:
 *   ?status=todo&priority=high&q=report&sort=-createdAt&limit=20&offset=0
 */
export function parseListQuery(params) {
  let sort = params.get('sort') ?? '-createdAt';
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  if (!SORTABLE_FIELDS.includes(field)) {
    throw new HttpError(400, `sort must be one of: ${SORTABLE_FIELDS.join(', ')}`);
  }

  return {
    status: params.get('status'),
    priority: params.get('priority'),
    q: params.get('q')?.trim().toLowerCase() || null,
    sort: { field, direction },
    limit: parseIntParam(params, 'limit', DEFAULT_LIMIT),
    offset: parseIntParam(params, 'offset', 0),
  };
}

/** Applies filters, sorting and pagination to a list of tasks. */
export function applyListQuery(tasks, query) {
  let results = tasks;

  if (query.status) results = results.filter((t) => t.status === query.status);
  if (query.priority) results = results.filter((t) => t.priority === query.priority);
  if (query.q) {
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(query.q) ||
        t.description.toLowerCase().includes(query.q)
    );
  }

  const { field, direction } = query.sort;
  results = [...results].sort((a, b) => {
    if (a[field] < b[field]) return -1 * direction;
    if (a[field] > b[field]) return 1 * direction;
    return 0;
  });

  const total = results.length;
  const data = results.slice(query.offset, query.offset + query.limit);
  return { data, meta: { total, limit: query.limit, offset: query.offset } };
}
