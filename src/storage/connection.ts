import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import * as fs from "fs";
import * as path from "path";

let sqlPromise: Promise<SqlJsStatic> | null = null;
const dbs = new Map<string, SqlJsDatabase>();

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

export async function openDatabase(dbPath: string): Promise<SqlJsDatabase> {
  const existing = dbs.get(dbPath);
  if (existing) return existing;

  const SQL = await getSql();

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let db: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  dbs.set(dbPath, db);
  return db;
}

export function saveDatabase(dbPath: string, db: SqlJsDatabase): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(dbPath: string): void {
  const db = dbs.get(dbPath);
  if (db) {
    db.close();
    dbs.delete(dbPath);
  }
}

export function isOpen(dbPath: string): boolean {
  return dbs.has(dbPath);
}
