import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
test("portal contains account, study, portfolio and block UI",()=>{for(const id of ["authModal","blockGrid","lessonPanel","portfolioContent","syncStatus"])assert.ok(html.includes(`id="${id}"`))});
test("block 2 is gated by completion of block 1",()=>{assert.match(js,/function blockUnlocked\([^)]*\).*blockDone\(COURSE\.blocks\[[^\]]+-1\]\)/s);assert.match(js,/Complete Block/)});
test("cloud progress API is used",()=>{assert.match(js,/api\('progress'/);assert.match(js,/api\('session'/)});