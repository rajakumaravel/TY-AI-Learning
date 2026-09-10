CREATE TABLE IF NOT EXISTS formative_assessments (
  identity_user_id TEXT NOT NULL REFERENCES learners(identity_user_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  suggested_level TEXT NOT NULL,
  suggested_score INTEGER NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_level TEXT,
  teacher_comment TEXT,
  reviewed_by TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (identity_user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_formative_assessments_student ON formative_assessments(identity_user_id);
