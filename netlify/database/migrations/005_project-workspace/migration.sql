CREATE TABLE IF NOT EXISTS student_projects (
  identity_user_id TEXT NOT NULL REFERENCES learners(identity_user_id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','reviewed')),
  workspace JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (identity_user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_student_projects_status ON student_projects(status);
CREATE INDEX IF NOT EXISTS idx_student_projects_updated ON student_projects(updated_at DESC);