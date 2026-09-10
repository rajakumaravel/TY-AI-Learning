import test from "node:test";import assert from "node:assert/strict";import { normalizeCode, validPin, hashPin, verifyPin, signSession, verifySession, getCookie } from "../netlify/functions/auth-utils.mjs";
test("student codes are normalized and bounded",()=>{assert.equal(normalizeCode(" ty-rk 01!! "),"TY-RK01")});
test("PIN policy accepts 4-8 numeric digits",()=>{assert.equal(validPin("1234"),true);assert.equal(validPin("12345678"),true);assert.equal(validPin("123"),false);assert.equal(validPin("12ab"),false)});
test("PIN hashing verifies correct PIN and rejects wrong PIN",()=>{const h=hashPin("2468");assert.equal(verifyPin("2468",h.salt,h.hash),true);assert.equal(verifyPin("1111",h.salt,h.hash),false)});
test("signed sessions validate and tampering fails",()=>{const token=signSession("student-1","secret",60);assert.equal(verifySession(token,"secret"),"student-1");assert.equal(verifySession(token+"x","secret"),null);assert.equal(verifySession(token,"wrong"),null)});
test("cookie parser extracts a session",()=>{assert.equal(getCookie("a=1; ty_session=abc.def; z=3","ty_session"),"abc.def")});
