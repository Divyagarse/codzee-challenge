# taskflow-api

A small, dependency-free REST API for managing tasks, built on Node's built-in `http` module.
This repository is used to explore AI-assisted code review with [Codzee](https://www.codzee.io).

## Requirements

- Node.js 22+ (the test script relies on `node --test` glob support)

## Getting started

```bash
npm start        # starts the server on http://localhost:3000 (override with PORT)
npm test         # runs the test suite with node:test
```

### Persistence

By default tasks are kept in memory and lost on restart. Set `DATA_FILE` to persist them to a JSON file:

```bash
DATA_FILE=./data/tasks.json npm start
```

Writes are atomic: data is written to a temporary file, synced to disk and renamed into place. A request only succeeds once its change is on disk; if the write fails the change is rolled back and the request returns `500`. On `SIGTERM`/`SIGINT` the server finishes in-flight requests and pending writes before exiting.

## API

| Method | Path          | Description        |
| ------ | ------------- | ------------------ |
| GET    | `/health`     | Health check       |
| GET    | `/tasks`      | List all tasks     |
| GET    | `/tasks/:id`  | Get a single task  |
| POST   | `/tasks`      | Create a task      |
| PATCH  | `/tasks/:id`  | Update a task      |
| DELETE | `/tasks/:id`  | Delete a task      |

A task has the shape:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

## Listing tasks

`GET /tasks` supports the following query parameters:

| Parameter  | Example        | Description                                              |
| ---------- | -------------- | -------------------------------------------------------- |
| `status`   | `todo`         | Only tasks with this status                              |
| `priority` | `high`         | Only tasks with this priority                            |
| `q`        | `report`       | Case-insensitive search in title and description         |
| `sort`     | `-createdAt`   | `createdAt`, `updatedAt`, `title` (case-insensitive) or `priority` (low < medium < high); prefix `-` for descending (default `-createdAt`) |
| `limit`    | `20`           | Page size (default 20)                                   |
| `offset`   | `40`           | Number of tasks to skip (default 0)                      |

The response includes pagination metadata:

```json
{ "data": [ ... ], "meta": { "total": 57, "limit": 20, "offset": 40 } }
```

## Validation

- `title` is required on create, must be a non-empty string (trimmed) of at most 200 characters.
- `description` must be a string of at most 5000 characters.
- `status` must be one of `todo`, `in_progress`, `done`; `priority` one of `low`, `medium`, `high`.
- Unknown fields (including `id`, `createdAt`, `updatedAt`) are rejected with `400`.
- Request bodies must be JSON (`415` otherwise) and at most 1 MiB (`413` otherwise).

## Project layout

```
src/
  app.js          # HTTP server + error handling
  router.js       # minimal router with :param support
  http.js         # JSON helpers and HttpError
  store.js        # in-memory task store
  query.js        # list filtering, sorting and pagination
  validation.js   # request payload validation
  file-store.js   # JSON-file-backed task store (DATA_FILE)
  routes/tasks.js # task endpoints
test/             # node:test integration tests
```
