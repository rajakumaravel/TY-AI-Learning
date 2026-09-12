import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPortfolioExport, buildCoordinatorSummary } from '../lib/portfolio-export.mjs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const MARK='ZZ-MARKER-';
const marker=(n)=>`${MARK}${n}`;

// A fixture carrying every field the export must never expose (ADR-008 §1), plus a distinct marker string
// in every free-text field, so the coordinator summary's "no marker anywhere" test is meaningful.
function fixture(){
  return {
    displayName:'Aoife Byrne',
    email:'aoife.byrne@example.com',
    authUserId:'auth0|abc123',
    lastLoginAt:'2026-09-01T08:00:00.000Z',
    programmeName:'AI in Practice — Transition Year pilot',
    exportDate:'2026-09-12',
    completionPct:62,
    chapters:[
      {
        number:1,
        title:'Meet the machine',
        badge:'First Steps',
        badgeEarned:true,
        assessment:{level:'Getting there',teacherLevel:'Getting there',suggestedLevel:'Getting started',reviewedBy:'auth0|teacher456'},
        sessions:[
          {title:'What is AI, really?',reflection:`I learned that AI finds patterns in data. ${marker(1)}`}
        ],
        evidence:[
          {label:'What surprised you',value:`It got the weather wrong. ${marker(2)}`}
        ],
        // The project belongs to its chapter, the way the app assembles it.
        project:{
          status:'submitted',
          deliverables:[['Prototype',`A working prototype. ${marker(3)}`],['Test log','Three testers, two confused']],
          finalRecommendation:`We should pilot this with one class first. ${marker(4)}`
        }
      }
    ]
  };
}

test('portfolio export contains the learner\'s own work in full',()=>{
  const html=buildPortfolioExport(fixture());
  assert.match(html,/Aoife Byrne/);
  assert.match(html,new RegExp(marker(1)));
  assert.match(html,new RegExp(marker(2)));
  assert.match(html,new RegExp(marker(3)));
  assert.match(html,/Getting there/);
  assert.match(html,/62/);
  assert.match(html,/class="portfolio-export"/);
});

test('portfolio export never carries email, auth id, reviewed_by or login timestamp',()=>{
  const html=buildPortfolioExport(fixture());
  assert.doesNotMatch(html,/aoife\.byrne@example\.com/);
  assert.doesNotMatch(html,/auth0\|abc123/);
  assert.doesNotMatch(html,/auth0\|teacher456/);
  assert.doesNotMatch(html,/2026-09-01T08:00:00/);
});

test('coordinator summary never carries email, auth id, reviewed_by or login timestamp',()=>{
  const html=buildCoordinatorSummary(fixture());
  assert.doesNotMatch(html,/aoife\.byrne@example\.com/);
  assert.doesNotMatch(html,/auth0\|abc123/);
  assert.doesNotMatch(html,/auth0\|teacher456/);
  assert.doesNotMatch(html,/2026-09-01T08:00:00/);
});

test('coordinator summary contains no marker from any free-text field',()=>{
  const html=buildCoordinatorSummary(fixture());
  assert.doesNotMatch(html,new RegExp(MARK));
});

test('coordinator summary still shows the non-free-text record: chapters, badges, levels, completion',()=>{
  const html=buildCoordinatorSummary(fixture());
  assert.match(html,/Aoife Byrne/);
  assert.match(html,/Meet the machine/);
  assert.match(html,/First Steps/);
  assert.match(html,/Getting there/);
  assert.match(html,/62/);
});

test('both artefacts carry the formative-evidence standing note (ADR-008 §6)',()=>{
  const note=/formative evidence from a pilot/i;
  assert.match(buildPortfolioExport(fixture()),note);
  assert.match(buildCoordinatorSummary(fixture()),note);
  assert.match(buildPortfolioExport(fixture()),/class="export-note"/);
  assert.match(buildCoordinatorSummary(fixture()),/class="export-note"/);
});

test('portfolio export labels the assessment level by its source',()=>{
  const html=buildPortfolioExport(fixture());
  assert.match(html,/Teacher level/);
});

test('two separate artefacts: the coordinator summary is not the portfolio export with a flag',()=>{
  const portfolio=buildPortfolioExport(fixture());
  const summary=buildCoordinatorSummary(fixture());
  assert.notEqual(portfolio,summary);
  assert.doesNotMatch(summary,/portfolio-export/);
});

test('the export adds no endpoint: it builds from held state plus the existing projects route',()=>{
  assert.match(app,/exportPortfolio/);
  assert.match(app,/exportCoordinatorSummary/);
  assert.match(app,/buildPortfolioExport/);
  assert.match(app,/buildCoordinatorSummary/);
  // Reading the projects route the workspace already uses is fine; a route invented for export is not.
  assert.match(app,/api\('projects\/'/,'project work is read through the existing projects route');
  const invented=app.match(/api\('(?!progress|projects\/|chapter-assessment)[a-z-]+/g)||[];
  assert.deepEqual(invented.filter(x=>/export|portfolio|summary/i.test(x)),[],'no route invented for the export');
});

test('index.html carries the two labelled export controls',()=>{
  assert.match(index,/id="exportPortfolio"/);
  assert.match(index,/id="exportCoordinatorSummary"/);
});

test('both artefacts are readable on a phone: the exported document declares a viewport',()=>{
  for(const html of [buildPortfolioExport(fixture()),buildCoordinatorSummary(fixture())]){
    assert.match(html,/<meta name="viewport" content="width=device-width/,'a document read on a phone needs a viewport');
  }
});
