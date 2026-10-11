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
    // Mutations and their writes are chained so only one runs at a time.
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
   * Runs one mutation at a time: applies it in memory, writes the result to
   * disk, and restores the previous state if the write fails. Because
   * mutations never overlap, a write only ever contains changes that have
   * already succeeded plus its own, and a rollback restores the exact state
   * (including task order) from before the mutation.
   */
  mutate(apply) {
    const result = this.writeQueue.then(async () => {
      const snapshot = new Map(this.tasks);
      const value = apply();
      if (!value) return value; // nothing changed, e.g. unknown id
      try {
        await this.writeFile();
      } catch (err) {
        this.tasks = snapshot;
        throw err;
      }
      return value;
    });
    this.writeQueue = result.catch(() => {});
    return result;
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

  // Mutations resolve only once the change is on disk, and reject (with the
  // in-memory change rolled back) if the write fails, so callers never report
  // a lost write as saved.

  create(input) {
    return this.mutate(() => super.create(input));
  }

  update(id, changes) {
    return this.mutate(() => super.update(id, changes));
  }

  delete(id) {
    return this.mutate(() => super.delete(id));
  }
}
