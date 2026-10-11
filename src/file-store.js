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

  /**
   * Queues a write of the current state. The returned promise rejects if
   * that write fails; the queue itself keeps going for later writes.
   */
  persist() {
    const write = this.writeQueue.then(() => this.writeFile());
    this.writeQueue = write.catch(() => {});
    return write;
  }

  /** Resolves once every queued write has settled. */
  flush() {
    return this.writeQueue;
  }

  async writeFile() {
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const handle = await fs.open(tmpPath, 'w');
      try {
        await handle.writeFile(JSON.stringify(this.list(), null, 2));
        // Flush to disk before the rename so a power loss can't leave the
        // renamed file empty or truncated.
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(tmpPath, this.filePath);
    } catch (err) {
      await fs.rm(tmpPath, { force: true });
      throw err;
    }
  }

  // Mutations resolve only once the change is on disk. If the write fails the
  // in-memory change is rolled back (unless a later change already replaced
  // it) and the error is rethrown, so callers never report a lost write as saved.

  async create(input) {
    const task = super.create(input);
    try {
      await this.persist();
    } catch (err) {
      if (this.tasks.get(task.id) === task) this.tasks.delete(task.id);
      throw err;
    }
    return task;
  }

  async update(id, changes) {
    const previous = this.tasks.get(id);
    const task = super.update(id, changes);
    if (!task) return task;
    try {
      await this.persist();
    } catch (err) {
      if (this.tasks.get(id) === task) this.tasks.set(id, previous);
      throw err;
    }
    return task;
  }

  async delete(id) {
    const previous = this.tasks.get(id);
    const deleted = super.delete(id);
    if (!deleted) return deleted;
    try {
      await this.persist();
    } catch (err) {
      if (!this.tasks.has(id)) this.tasks.set(id, previous);
      throw err;
    }
    return deleted;
  }
}
