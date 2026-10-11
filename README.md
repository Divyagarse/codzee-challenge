# taskflow-api

A small, dependency-free REST API for managing tasks, built on Node's built-in `http` module.
This repository is used to explore AI-assisted code review with [Codzee](https://www.codzee.io).

## Requirements

- Node.js 20+

## Getting started

```bash
npm start        # starts the server on http://localhost:3000 (override with PORT)
npm test         # runs the test suite with node:test
```

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
  validation.js   # request payload validation
  routes/tasks.js # task endpoints
test/             # node:test integration tests
```
