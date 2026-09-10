CREATE TABLE IF NOT EXISTS chapter_assessments (
  identity_user_id TEXT NOT NULL REFERENCES learners(identity_user_id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_level TEXT NOT NULL,
  suggested_score INTEGER NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_level TEXT,
  teacher_comment TEXT,
  reviewed_by TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (identity_user_id, block_id)
);
CREATE INDEX IF NOT EXISTS idx_chapter_assessments_student ON chapter_assessments(identity_user_id);
