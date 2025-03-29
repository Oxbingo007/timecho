import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

// 创建数据库连接
const sqlite = new Database('sqlite.db')
export const db = drizzle(sqlite, { schema })

// 初始化数据库
export async function initDatabase() {
  // 创建表
  const createTables = `
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_selected INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (interview_id) REFERENCES interviews (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (interview_id) REFERENCES interviews (id) ON DELETE CASCADE
    );
  `
  
  sqlite.exec(createTables)
} 