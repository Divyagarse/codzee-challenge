import { HttpError } from './http.js';

export const STATUSES = ['todo', 'in_progress', 'done'];
export const PRIORITIES = ['low', 'medium', 'high'];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority'];

function assertPlainObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
}

function validateField(field, value) {
  switch (field) {
    case 'title': {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new HttpError(400, 'title must be a non-empty string');
      }
      const title = value.trim();
      if (title.length > MAX_TITLE_LENGTH) {
        throw new HttpError(400, `title must be at most ${MAX_TITLE_LENGTH} characters`);
      }
      return title;
    }
    case 'description': {
      if (typeof value !== 'string') {
        throw new HttpError(400, 'description must be a string');
      }
      if (value.length > MAX_DESCRIPTION_LENGTH) {
        throw new HttpError(400, `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
      }
      return value;
    }
    case 'status': {
      if (!STATUSES.includes(value)) {
        throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
      }
      return value;
    }
    case 'priority': {
      if (!PRIORITIES.includes(value)) {
        throw new HttpError(400, `priority must be one of: ${PRIORITIES.join(', ')}`);
      }
      return value;
    }
    default:
      throw new HttpError(400, `Unknown field: ${field}`);
  }
}

function pickValidated(body) {
  const result = {};
  for (const [field, value] of Object.entries(body)) {
    if (!EDITABLE_FIELDS.includes(field)) {
      throw new HttpError(400, `Unknown field: ${field}`);
    }
    result[field] = validateField(field, value);
  }
  return result;
}

/** Validates a create payload and returns only the allowed, normalised fields. */
export function validateCreate(body) {
  assertPlainObject(body);
  if (!('title' in body)) throw new HttpError(400, 'title is required');
  return pickValidated(body);
}

/** Validates a partial update payload; at least one editable field is required. */
export function validateUpdate(body) {
  assertPlainObject(body);
  const changes = pickValidated(body);
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Request body must contain at least one field to update');
  }
  return changes;
}
