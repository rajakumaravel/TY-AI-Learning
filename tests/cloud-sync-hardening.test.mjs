import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { safeEvidenceUrl, projectReadyForSubmission } from '../lib/project-briefs.mjs';

const app = fs.readFileSync('app.js', 'utf8');
const cfApi = fs.readFileSync('functions/api/[[path]].js', 'utf8');
const netlifyProjects = fs.readFileSync('netlify/functions/projects.mts', 'utf8');
const adminProjects = fs.readFileSync('admin-projects.js', 'utf8');
const lockDown = fs.readFileSync('supabase/migrations/20260910120000_lock_down_auth_trigger.sql', 'utf8');

test('evidence URLs: only absolute http(s) links survive', () => {
  assert.equal(safeEvidenceUrl('https://teachablemachine.withgoogle.com/models/abc/'), 'https://teachablemachine.withgoogle.com/models/abc/');
  assert.equal(safeEvidenceUrl('  http://example.ie/x  '), 'http://example.ie/x');
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:fetch(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '//evil.example/x', 'not a url', '']) {
    assert.equal(safeEvidenceUrl(bad), '', bad);
  }
});

test('a javascript: link no longer counts as submission evidence', () => {
  const workspace = {
    workLog: [{ did: 'Trained model V1 on 40 images per class', result: 'Failed on dark backgrounds' }],
    evidence: [{ url: 'javascript:alert(1)' }, { url: 'javascript:alert(2)' }, { url: 'javascript:alert(3)' }],
    finalRecommendation: 'x'.repeat(80)
  };
  assert.equal(projectReadyForSubmission(workspace), false);
});

test('both project APIs sanitise evidence URLs server-side', () => {
  assert.match(cfApi, /url:safeEvidenceUrl\(e\?\.url\)/);
  assert.match(netlifyProjects, /url:safeEvidenceUrl\(item\?\.url\)/);
});

test('admin review only renders http(s) evidence links as anchors', () => {
  assert.match(adminProjects, /safeHref/);
  assert.doesNotMatch(adminProjects, /href="\$\{esc\(x\.url\)\}"/);
});

test('signed-in learner with a failing API is not shown as signed out, and never pushes stale state', () => {
  assert.match(app, /let cloudError=null/);
  assert.match(app, /Signed in · cloud sync unavailable/);
  assert.match(app, /if\(!user\|\|cloudError\)return;/);
  assert.match(app, /if\(cloudError\)\{feedback\('capstoneFeedback'/);
  assert.doesNotMatch(app, /Netlify Identity account/);
});

test('auth-trigger lock-down migration is executable SQL, not a single comment line', () => {
  assert.doesNotMatch(lockDown, /\\n/);
  assert.match(lockDown, /^revoke execute on function public\.handle_new_auth_user\(\) from public, anon, authenticated;$/m);
});
