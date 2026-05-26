import type { Database as SqlJsDatabase } from "sql.js";
import { nanoid } from "nanoid";

export interface CandidateInput {
  kind: "preference" | "pattern" | "entity" | "constraint";
  content: string;
  projectId: string;
  confidence?: number;
}

export function upsertCandidate(
  db: SqlJsDatabase,
  input: CandidateInput
): void {
  const existing = db.exec(
    `SELECT id, evidence_project_ids, evidence_count, confidence FROM memory_candidates
     WHERE kind = ? AND content = ? AND status = 'pending'`,
    [input.kind, input.content]
  );

  const now = new Date().toISOString();

  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = existing[0].values[0];
    const id = String(row[0]);
    const evidenceIds: string[] = JSON.parse(String(row[1]));
    if (!evidenceIds.includes(input.projectId)) {
      evidenceIds.push(input.projectId);
    }
    const evidenceCount = evidenceIds.length;
    const confidence = Math.min(0.95, (input.confidence ?? 0.5) + evidenceCount * 0.1);

    db.run(
      `UPDATE memory_candidates SET evidence_project_ids = ?, evidence_count = ?, confidence = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(evidenceIds), evidenceCount, confidence, now, id]
    );

    if (evidenceCount >= 3) {
      autoApproveCandidate(db, id);
    }
  } else {
    const id = nanoid();
    db.run(
      `INSERT INTO memory_candidates (id, kind, content, evidence_project_ids, evidence_count, confidence, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, 'pending', ?, ?)`,
      [id, input.kind, input.content, JSON.stringify([input.projectId]), input.confidence ?? 0.5, now, now]
    );
  }
}

function autoApproveCandidate(db: SqlJsDatabase, candidateId: string): void {
  const result = db.exec(
    `SELECT kind, content FROM memory_candidates WHERE id = ? AND status = 'pending'`,
    [candidateId]
  );
  if (result.length === 0 || result[0].values.length === 0) return;

  const row = result[0].values[0];
  const kind = String(row[0]);
  const content = String(row[1]);

  const now = new Date().toISOString();
  db.run(
    `UPDATE memory_candidates SET status = 'approved', updated_at = ? WHERE id = ?`,
    [now, candidateId]
  );

  const category = candidateKindToPreferenceCategory(kind);
  const prefId = nanoid();
  const alreadyExists = db.exec(
    `SELECT id FROM developer_preferences WHERE preference = ? AND status = 'active'`,
    [content]
  );
  if (alreadyExists.length > 0 && alreadyExists[0].values.length > 0) return;

  db.run(
    `INSERT INTO developer_preferences (id, category, preference, applies_to, confidence, source, evidence_project_ids, status, created_at, updated_at)
     VALUES (?, ?, ?, '{}', 0.7, 'inferred', '[]', 'active', ?, ?)`,
    [prefId, category, content, now, now]
  );
}

function candidateKindToPreferenceCategory(
  kind: string
): string {
  switch (kind) {
    case "preference": return "coding_style";
    case "pattern": return "architecture_preference";
    case "entity": return "library_preference";
    case "constraint": return "avoidance";
    default: return "coding_style";
  }
}

export function getPendingCandidates(db: SqlJsDatabase): Record<string, unknown>[] {
  try {
    const result = db.exec(
      `SELECT * FROM memory_candidates WHERE status = 'pending' ORDER BY confidence DESC`
    );
    if (result.length === 0) return [];
    return result[0].values.map(v => ({
      id: String(v[0]),
      kind: String(v[1]),
      content: String(v[2]),
      evidenceProjectIds: JSON.parse(String(v[3])),
      evidenceCount: Number(v[4]),
      confidence: Number(v[5]),
      status: String(v[6]),
      createdAt: String(v[7]),
      updatedAt: String(v[8]),
    }));
  } catch {
    return [];
  }
}

export function approveCandidate(db: SqlJsDatabase, candidateId: string): boolean {
  const result = db.exec(
    `SELECT * FROM memory_candidates WHERE id = ? AND status = 'pending'`,
    [candidateId]
  );
  if (result.length === 0 || result[0].values.length === 0) return false;

  autoApproveCandidate(db, candidateId);
  return true;
}

export function rejectCandidate(db: SqlJsDatabase, candidateId: string): boolean {
  const result = db.exec(
    `SELECT id FROM memory_candidates WHERE id = ? AND status = 'pending'`,
    [candidateId]
  );
  if (result.length === 0 || result[0].values.length === 0) return false;

  const now = new Date().toISOString();
  db.run(
    `UPDATE memory_candidates SET status = 'rejected', updated_at = ? WHERE id = ?`,
    [now, candidateId]
  );
  return true;
}

export function forgetCandidate(db: SqlJsDatabase, candidateId: string): boolean {
  const now = new Date().toISOString();
  db.run(
    `UPDATE memory_candidates SET status = 'archived', updated_at = ? WHERE id = ?`,
    [now, candidateId]
  );
  return true;
}

export function getCandidateCount(db: SqlJsDatabase): number {
  try {
    const result = db.exec(`SELECT COUNT(*) FROM memory_candidates WHERE status = 'pending'`);
    if (result.length === 0) return 0;
    return Number(result[0].values[0][0]);
  } catch {
    return 0;
  }
}
