import { HttpError } from './http.js';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'priority'];
const DEFAULT_LIMIT = 20;
const PRIORITY_RANK = new Map([['low', 0], ['medium', 1], ['high', 2]]);

function parseIntParam(params, name, fallback) {
  const raw = params.get(name);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new HttpError(400, `${name} must be a non-negative integer`);
  }
  return Number(raw);
}

function compareField(field, a, b) {
  if (field === 'priority') return (PRIORITY_RANK.get(a) ?? -1) - (PRIORITY_RANK.get(b) ?? -1);
  if (field === 'title') return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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
        String(t.title ?? '').toLowerCase().includes(query.q) ||
        String(t.description ?? '').toLowerCase().includes(query.q)
    );
  }

  const { field, direction } = query.sort;
  results = [...results].sort((a, b) => compareField(field, a[field], b[field]) * direction);

  const total = results.length;
  const data = results.slice(query.offset, query.offset + query.limit);
  return { data, meta: { total, limit: query.limit, offset: query.offset } };
}
