import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruct __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'audit_trail.db'));

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_prompt TEXT NOT NULL,
    agents_triggered TEXT NOT NULL,
    final_response TEXT NOT NULL,
    trace_json TEXT NOT NULL
  )
`);

export interface LogEntry {
  id: string;
  user_prompt: string;
  agents_triggered: string;
  final_response: string;
  trace_json: string;
}

export const dbService = {
  saveLog: (log: LogEntry) => {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_prompt, agents_triggered, final_response, trace_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(log.id, log.user_prompt, log.agents_triggered, log.final_response, log.trace_json);
  },

  getLogs: (): LogEntry[] => {
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all() as LogEntry[];
  }
};