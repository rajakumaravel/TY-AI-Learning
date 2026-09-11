import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const course=JSON.parse(fs.readFileSync('curriculum.json','utf8'));
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const migration=fs.readFileSync('netlify/database/migrations/002_google-identity/migration.sql','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('pilot contains the three chapters in order',()=>{assert.deepEqual(course.blocks.map(b=>b.title),['AI & Me','Teaching a Machine','Data Detective'])});
test('chapter durations match the student book and the Phase 4 contract',()=>{assert.equal(course.blocks[0].sessions.reduce((n,s)=>n+s.minutes,0),120);assert.equal(course.blocks[1].sessions.reduce((n,s)=>n+s.minutes,0),240);assert.equal(course.blocks[2].sessions.reduce((n,s)=>n+s.minutes,0),180)});
test('student book learning outcomes and badges are preserved',()=>{assert.deepEqual(course.blocks[0].outcomes,['LO1','LO4']);assert.equal(course.blocks[0].badge,'AI Explorer');assert.deepEqual(course.blocks[1].outcomes,['LO1','LO2','LO3','LO9']);assert.equal(course.blocks[1].badge,'Machine Trainer');assert.deepEqual(course.blocks[2].outcomes,['LO5','LO6','LO9']);assert.equal(course.blocks[2].badge,'Data Detective')});
test('every session includes study material before student response',()=>{for(const b of course.blocks)for(const s of b.sessions){assert.ok(s.pageRef.includes('Student Book'));assert.ok(s.study.body.length>=2);assert.ok(s.study.keywords.length>=3);assert.ok(s.reflection.length>20)}});
test('chapter 1 mission requires five systems and full chains',()=>{assert.match(course.blocks[0].mission,/five systems/i);assert.match(course.blocks[0].mission,/INPUT.*AI ACTION.*OUTPUT.*BENEFIT.*RISK/i)});
test('chapter 2 includes test log, confusion matrix and shortcut learning',()=>{const kinds=course.blocks[1].sessions.map(s=>s.activity.kind);assert.ok(kinds.includes('testlog'));assert.ok(kinds.includes('matrix'));assert.ok(course.blocks[1].sessions.some(s=>/shortcut/i.test(s.title+s.study.title)))});
test('chapter 3 follows the student book route, mission and portfolio',()=>{const b=course.blocks[2];assert.deepEqual(b.sessions.map(s=>s.id),['b3s1','b3s2','b3s3','b3s4','b3s5','b3s6']);assert.deepEqual(b.sessions.map(s=>s.activity.kind),['quiz','lab','chain','dataset','textfields','textfields']);assert.match(b.mission,/^Audit one digital service at category level/);assert.deepEqual(b.route.map(r=>r[1]),['Data trail warm-up','Data Tracking Sherlock','Why collect it?','Cookie and scraping mini-lab','Dataset fairness challenge','Discover: your rights and the safeguards','Design a better data plan','Reflection']);assert.equal(b.myths.length,3);assert.deepEqual(Object.keys(b.selfCheck),['Getting started','Getting there','Going further']);assert.match(b.levelUp,/^Compare two services that do a similar job/);for(const s of b.sessions)assert.equal(s.pageRef,'Student Book pp. 14–17')});
test('next chapter is gated by previous chapter practical completion and capstone qualification',()=>{assert.match(app,/blockDone\(COURSE\.blocks\[i-1\]\).*blockQualified\(COURSE\.blocks\[i-1\]\)/)});
test('frontend uses Google OAuth and removes custom account creation',()=>{assert.match(app,/oauthLogin\('google'\)/);assert.doesNotMatch(app,/studentPin|studentCode|Create account/);assert.match(index,/Continue with Google/)});
test('server verifies Netlify Identity rather than custom session cookies',()=>{assert.match(api,/getUser.*@netlify\/identity/s);assert.doesNotMatch(api,/SESSION_SECRET|verifyPin|student_code/)});
test('identity database stores only identity id and display name, not a duplicate email',()=>{assert.match(migration,/identity_user_id/);assert.match(migration,/learner_progress/);assert.doesNotMatch(migration,/email\s+TEXT/i)});
test('Vite production build and Netlify Identity dependency are configured',()=>{assert.equal(pkg.scripts.build,'vite build');assert.ok(pkg.dependencies['@netlify/identity']);assert.ok(pkg.devDependencies.vite)});
