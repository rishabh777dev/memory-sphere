import { openDB, IDBPDatabase } from 'idb';
import { Memory } from '../types';

const DB_NAME = 'MemorySphereDB';
const STORE_NAME = 'memories';

interface MemoryDoc extends Memory {
  blob: Blob;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function saveMemory(memory: Memory, file: File) {
  const db = await getDB();
  await db.put(STORE_NAME, {
    ...memory,
    blob: file,
  });
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await getDB();
  const docs = await db.getAll(STORE_NAME);
  return docs.map(doc => ({
    ...doc,
    url: URL.createObjectURL(doc.blob),
  }));
}

export async function deleteMemory(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllMemories() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
