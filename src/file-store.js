import fs from 'node:fs/promises';
import path from 'node:path';
import { TaskStore } from './store.js';

/**
 * A TaskStore that persists every change to a JSON file on disk.
 * Writes go to a temporary file first and are then renamed into place,
 * so a crash mid-write never leaves a half-written data file behind.
 */
export class FileTaskStore extends TaskStore {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    // Writes are chained so only one write is in flight at a time and the
    // last write always reflects the latest in-memory state.
    this.writeQueue = Promise.resolve();
  }

  static async open(filePath) {
    const store = new FileTaskStore(filePath);
    await store.load();
    return store;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const tasks = JSON.parse(raw);
      this.tasks = new Map(tasks.map((task) => [task.id, task]));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.tasks = new Map();
    }
  }

  persist() {
    this.writeQueue = this.writeQueue
      .then(() => this.writeFile())
      .catch((err) => {
        console.error(`Failed to persist tasks to ${this.filePath}:`, err);
      });
    return this.writeQueue;
  }

  /** Resolves once every queued write has been flushed to disk. */
  flush() {
    return this.writeQueue;
  }

  async writeFile() {
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tmpPath, JSON.stringify(this.list(), null, 2));
    await fs.rename(tmpPath, this.filePath);
  }

  create(input) {
    const task = super.create(input);
    this.persist();
    return task;
  }

  update(id, changes) {
    const task = super.update(id, changes);
    if (task) this.persist();
    return task;
  }

  delete(id) {
    const deleted = super.delete(id);
    if (deleted) this.persist();
    return deleted;
  }
}
