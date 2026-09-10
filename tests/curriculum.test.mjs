import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const c=JSON.parse(fs.readFileSync(new URL("../curriculum.json",import.meta.url),"utf8"));
test("course has two ordered blocks",()=>{assert.equal(c.blocks.length,2);assert.equal(c.blocks[0].id,"block1");assert.equal(c.blocks[1].id,"block2")});
test("every session contains substantive study material",()=>{for(const b of c.blocks)for(const s of b.sessions){assert.ok(s.study);assert.ok(s.study.body.length>=3);assert.ok(s.study.example.length>40);assert.ok(s.study.keywords.length>=4)}});
test("session ids are unique",()=>{const ids=c.blocks.flatMap(b=>b.sessions.map(s=>s.id));assert.equal(new Set(ids).size,ids.length)});