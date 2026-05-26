import type { Database as SqlJsDatabase } from "sql.js";

export function migrateProjectDb(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tool TEXT NOT NULL CHECK(tool IN ('claude','opencode')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      cwd TEXT NOT NULL,
      title TEXT,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
      git_branch TEXT,
      git_commit TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('stdin','stdout')),
      content TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      project_id TEXT PRIMARY KEY,
      current_focus TEXT,
      active_problems TEXT NOT NULL DEFAULT '[]',
      next_actions TEXT NOT NULL DEFAULT '[]',
      recent_decisions TEXT NOT NULL DEFAULT '[]',
      important_files TEXT NOT NULL DEFAULT '[]',
      git_branch TEXT,
      git_commit TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_brain (
      project_id TEXT PRIMARY KEY,
      architecture TEXT NOT NULL DEFAULT '[]',
      tech_stack TEXT NOT NULL DEFAULT '[]',
      key_patterns TEXT NOT NULL DEFAULT '[]',
      known_constraints TEXT NOT NULL DEFAULT '[]',
      open_questions TEXT NOT NULL DEFAULT '[]',
      important_entities TEXT NOT NULL DEFAULT '[]',
      important_commands TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      decision TEXT NOT NULL,
      reason TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      importance_score REAL NOT NULL DEFAULT 0.5,
      last_referenced_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('file','api','library','concept','command','module')),
      name TEXT NOT NULL,
      global_entity_id TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workspace_state_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      source_session_id TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, start_time DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id, timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_state_versions_project ON workspace_state_versions(project_id, created_at DESC)`);
}

export function migrateUserDb(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      git_remote TEXT,
      primary_language TEXT,
      project_type TEXT,
      last_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS global_entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('library','concept','pattern','tool','framework','language')),
      name TEXT NOT NULL,
      description TEXT,
      usage_count INTEGER NOT NULL DEFAULT 1,
      linked_project_ids TEXT NOT NULL DEFAULT '[]',
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cross_project_patterns (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL,
      description TEXT,
      project_ids TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.5,
      last_seen_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS developer_preferences (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      preference TEXT NOT NULL,
      applies_to TEXT NOT NULL DEFAULT '{}',
      confidence REAL NOT NULL DEFAULT 0.5,
      source TEXT NOT NULL CHECK(source IN ('explicit','inferred')),
      evidence_project_ids TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','candidate','archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_global_entities_name ON global_entities(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_preferences_status ON developer_preferences(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_preferences_category ON developer_preferences(category)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory_candidates (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('preference','pattern','entity','constraint')),
      content TEXT NOT NULL,
      evidence_project_ids TEXT NOT NULL DEFAULT '[]',
      evidence_count INTEGER NOT NULL DEFAULT 1,
      confidence REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_candidates_status ON memory_candidates(status)`);
}
