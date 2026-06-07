import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MemorySphereCache';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export const cacheService = {
  async cacheImage(url: string): Promise<string> {
    const db = await getDB();
    const cached = await db.get(STORE_NAME, url);
    
    if (cached) {
      return URL.createObjectURL(cached);
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await db.put(STORE_NAME, blob, url);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Failed to cache image:', url, err);
      return url;
    }
  },

  async clearCache(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
  }
};
