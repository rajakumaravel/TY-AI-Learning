import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isAdminUser, parseAdminEmails, progressSummary } from "../lib/admin-auth.mjs";

test("admin email allowlist is normalized", () => {
  assert.deepEqual(parseAdminEmails(" Boss@Example.com, teacher@example.com "), ["boss@example.com","teacher@example.com"]);
});

test("admin authorization accepts configured email and admin role", () => {
  assert.equal(isAdminUser({ email:"boss@example.com", roles:[] }, "BOSS@example.com"), true);
  assert.equal(isAdminUser({ email:"student@example.com", roles:["admin"] }, ""), true);
  assert.equal(isAdminUser({ email:"student@example.com", roles:[] }, "boss@example.com"), false);
});

test("progress summary handles duplicate completed sessions safely", () => {
  assert.deepEqual(progressSummary({completed:["a","a","b"],badges:["x"],reflections:{a:"ok"}},4), {
    completed:2,badges:1,reflections:1,percent:50
  });
});

test("admin API endpoints are server-authorized", async () => {
  const api = await readFile(new URL("../netlify/functions/api.mts", import.meta.url), "utf8");
  assert.match(api, /requireAdmin/);
  assert.match(api, /admin\/students/);
  assert.match(api, /admin\\\/student/);
  assert.match(api, /Administrator access required/);
  assert.match(api, /Netlify\.env\.get\("ADMIN_EMAILS"\)/);
});

test("admin UI uses Google Identity and dedicated admin APIs", async () => {
  const js = await readFile(new URL("../admin.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../admin.html", import.meta.url), "utf8");
  assert.match(js, /oauthLogin\("google"\)/);
  assert.match(js, /admin\/students/);
  assert.match(js, /admin\/student/);
  assert.match(html, /Student progress & evidence/);
});

test("vite and Netlify expose the admin route", async () => {
  const vite = await readFile(new URL("../vite.config.mjs", import.meta.url), "utf8");
  const netlify = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");
  assert.match(vite, /admin\.html/);
  assert.match(netlify, /from = "\/admin"/);
  assert.match(netlify, /to = "\/admin\.html"/);
});
