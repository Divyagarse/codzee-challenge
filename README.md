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

## Listing tasks

`GET /tasks` supports the following query parameters:

| Parameter  | Example        | Description                                              |
| ---------- | -------------- | -------------------------------------------------------- |
| `status`   | `todo`         | Only tasks with this status                              |
| `priority` | `high`         | Only tasks with this priority                            |
| `q`        | `report`       | Case-insensitive search in title and description         |
| `sort`     | `-createdAt`   | `createdAt`, `updatedAt`, `title` or `priority`; prefix `-` for descending (default `-createdAt`) |
| `limit`    | `20`           | Page size (default 20)                                   |
| `offset`   | `40`           | Number of tasks to skip (default 0)                      |

The response includes pagination metadata:

```json
{ "data": [ ... ], "meta": { "total": 57, "limit": 20, "offset": 40 } }
```

## Project layout

```
src/
  app.js          # HTTP server + error handling
  router.js       # minimal router with :param support
  http.js         # JSON helpers and HttpError
  store.js        # in-memory task store
  query.js        # list filtering, sorting and pagination
  routes/tasks.js # task endpoints
test/             # node:test integration tests
```
