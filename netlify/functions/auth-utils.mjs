import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}
export function validPin(pin) { return /^\d{4,8}$/.test(String(pin ?? "")); }
export function hashPin(pin, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}
export function verifyPin(pin, saltHex, hashHex) {
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function b64url(input) { return Buffer.from(input).toString("base64url"); }
export function signSession(studentId, secret, maxAgeSeconds=60*60*24*30) {
  const payload = JSON.stringify({ sid: studentId, exp: Math.floor(Date.now()/1000)+maxAgeSeconds });
  const body = b64url(payload);
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function verifySession(token, secret) {
  if (!token) return null;
  const [body,sig] = token.split("."); if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null;
  try { const p=JSON.parse(Buffer.from(body,"base64url").toString("utf8")); if (!p.sid || p.exp < Math.floor(Date.now()/1000)) return null; return p.sid; } catch { return null; }
}
export function getCookie(cookieHeader, name) {
  const cookies=(cookieHeader||"").split(";").map(x=>x.trim());
  const hit=cookies.find(x=>x.startsWith(name+"="));
  return hit ? decodeURIComponent(hit.slice(name.length+1)) : undefined;
}
export function sessionCookie(token) { return `ty_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`; }
export function clearSessionCookie() { return `ty_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
