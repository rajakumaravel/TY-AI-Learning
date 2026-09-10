CREATE TABLE IF NOT EXISTS experience_lab_evidence (
  identity_user_id TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_user_id, lab_id),
  CONSTRAINT experience_lab_status_check CHECK (status IN ('not_started','in_progress','complete'))
);

CREATE INDEX IF NOT EXISTS experience_lab_evidence_user_idx
  ON experience_lab_evidence(identity_user_id, updated_at DESC);
