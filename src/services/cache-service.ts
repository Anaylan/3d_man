import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: unknown;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private dbPromise: Promise<IDBPDatabase<CacheDB>>;
  // A HashMap to store the cache. The key is the page and the value is the data.
  private cache = new Map<string, unknown>();
  // BehaviorSubject that will contain the updated cache data.
  public cache$ = new BehaviorSubject<unknown>(null);

  constructor() {
    this.dbPromise = this.initDB();
    this.loadAllFromDB();
  }

  /**
   * Initializes the IndexedDB database
   */
  private async initDB(): Promise<IDBPDatabase<CacheDB>> {
    return await openDB<CacheDB>('AppCacheDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }

  /**
   * Stores a typed value in the cache.
   * @param key - Unique key to identify the cached data.
   * @param data - The data to store.
   * @throws If the key already exists.
   */
  public async set<T>(key: string, data: T): Promise<void> {
    // We check if data already exists for this key.
    if (this.cache.has(key)) {
      // If it already exists, we throw an exception to prevent overwriting the data.
      throw new Error(
        `Data already exists for key '${key}'. Use a different key or delete the existing one first.`
      );
    }

    const db = await this.dbPromise;
    await db.put('cache', data, key);

    // If there is no data for this key, we store it in the cache and update the BehaviorSubject.
    this.cache.set(key, data);
    this.cache$.next(this.cache.get(key));
  }

  /**
   * Retrieves a typed value from the cache.
   * @param key - The key of the cached value.
   * @returns The cached value or undefined if not found.
   */
  public async get(key: string): Promise<unknown> {
    if (this.cache.has(key)) {
      const data = this.cache.get(key);
      this.cache$.next(data);
      return data;
    }

    const db = await this.dbPromise;
    const data = await db.get('cache', key);

    if (data !== undefined) {
      this.cache.set(key, data);
      this.cache$.next(data);
    }

    return data;
  }

  /**
   * Removes a single key from the cache.
   * @param key - The key to remove.
   */
  public async clear(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('cache', key);

    // We remove the data from the cache and update the BehaviorSubject.
    this.cache.delete(key);
    this.cache$.next(null);
  }

  /**
   * Clears the entire cache and removes all stored data from localStorage.
   */
  public async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('cache');

    this.cache.clear();
    this.cache$.next(null);
  }

  /**
   * Loads all existing data from IndexedDB into memory
   */
  private async loadAllFromDB(): Promise<void> {
    const db = await this.dbPromise;
    const allKeys = await db.getAllKeys('cache');
    for (const key of allKeys) {
      const value = await db.get('cache', key);
      this.cache.set(key, value);
    }
  }
}
