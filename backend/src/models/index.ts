import { Database } from 'sqlite3';
import { open } from 'sqlite';

export type User = { id: number; name: string; email: string; passwordHash: string };
export type Event = { id: number; title: string; startTime: string; endTime: string; status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING'; userId: number };
export type SwapRequest = { id: number; requesterSlotId: number; targetSlotId: number; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' };

let dbInstance: any = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await open({
    filename: './slotswapper.db',
    driver: Database
  });

  // Create tables if not exist
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('BUSY','SWAPPABLE','SWAP_PENDING')),
      userId INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS swap_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterSlotId INTEGER NOT NULL,
      targetSlotId INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
      FOREIGN KEY(requesterSlotId) REFERENCES events(id),
      FOREIGN KEY(targetSlotId) REFERENCES events(id)
    );
  `);
  return dbInstance;
}