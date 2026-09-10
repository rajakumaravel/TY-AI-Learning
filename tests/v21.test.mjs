import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const course=JSON.parse(fs.readFileSync('curriculum.json','utf8'));
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const api=fs.readFileSync('netlify/functions/api.mts','utf8');
const migration=fs.readFileSync('netlify/database/migrations/002_google-identity/migration.sql','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('pilot contains the two textbook chapters in order',()=>{assert.deepEqual(course.blocks.map(b=>b.title),['AI & Me','Teaching a Machine'])});
test('chapter durations match the student book',()=>{assert.equal(course.blocks[0].sessions.reduce((n,s)=>n+s.minutes,0),120);assert.equal(course.blocks[1].sessions.reduce((n,s)=>n+s.minutes,0),240)});
test('student book learning outcomes and badges are preserved',()=>{assert.deepEqual(course.blocks[0].outcomes,['LO1','LO4']);assert.equal(course.blocks[0].badge,'AI Explorer');assert.deepEqual(course.blocks[1].outcomes,['LO1','LO2','LO3','LO9']);assert.equal(course.blocks[1].badge,'Machine Trainer')});
test('every session includes study material before student response',()=>{for(const b of course.blocks)for(const s of b.sessions){assert.ok(s.pageRef.includes('Student Book'));assert.ok(s.study.body.length>=2);assert.ok(s.study.keywords.length>=3);assert.ok(s.reflection.length>20)}});
test('chapter 1 mission requires five systems and full chains',()=>{assert.match(course.blocks[0].mission,/five systems/i);assert.match(course.blocks[0].mission,/INPUT.*AI ACTION.*OUTPUT.*BENEFIT.*RISK/i)});
test('chapter 2 includes test log, confusion matrix and shortcut learning',()=>{const kinds=course.blocks[1].sessions.map(s=>s.activity.kind);assert.ok(kinds.includes('testlog'));assert.ok(kinds.includes('matrix'));assert.ok(course.blocks[1].sessions.some(s=>/shortcut/i.test(s.title+s.study.title)))});
test('next chapter is gated by completion of previous chapter',()=>{assert.match(app,/i===0\|\|blockDone\(COURSE\.blocks\[i-1\]\)/)});
test('frontend uses Google OAuth and removes custom account creation',()=>{assert.match(app,/oauthLogin\('google'\)/);assert.doesNotMatch(app,/studentPin|studentCode|Create account/);assert.match(index,/Continue with Google/)});
test('server verifies Netlify Identity rather than custom session cookies',()=>{assert.match(api,/getUser.*@netlify\/identity/s);assert.doesNotMatch(api,/SESSION_SECRET|verifyPin|student_code/)});
test('identity database stores only identity id and display name, not a duplicate email',()=>{assert.match(migration,/identity_user_id/);assert.match(migration,/learner_progress/);assert.doesNotMatch(migration,/email\s+TEXT/i)});
test('Vite production build and Netlify Identity dependency are configured',()=>{assert.equal(pkg.scripts.build,'vite build');assert.ok(pkg.dependencies['@netlify/identity']);assert.ok(pkg.devDependencies.vite)});
