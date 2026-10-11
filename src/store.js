import { randomUUID } from 'node:crypto';

/**
 * In-memory task store. Tasks look like:
 * { id, title, description, status, priority, createdAt, updatedAt }
 */
export class TaskStore {
  constructor() {
    this.tasks = new Map();
  }

  list() {
    return [...this.tasks.values()];
  }

  get(id) {
    return this.tasks.get(id) ?? null;
  }

  create({ title, description = '', status = 'todo', priority = 'medium' }) {
    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      title,
      description,
      status,
      priority,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id, changes) {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...changes,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id) {
    return this.tasks.delete(id);
  }
}
