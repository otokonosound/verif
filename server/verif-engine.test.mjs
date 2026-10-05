import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMessage } from "./verif-engine.mjs";

test("detects urgent payment phishing",()=>{const r=analyzeMessage("Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis");assert.equal(r.verdict,"stop");assert.ok(r.reasons.length>=2);assert.ok(r.summary)});
test("detects brand/domain mismatch",()=>{const r=analyzeMessage("Votre remboursement Ameli est disponible : https://example.com/remboursement");assert.equal(r.verdict,"stop");assert.match(r.reasons.join(" "),/ameli\.fr/)});
test("detects non-https and encoded domains",()=>{const r=analyzeMessage("Connectez-vous vite http://xn--example-9za.test/login");assert.equal(r.verdict,"caution");assert.ok(r.reasons.some(x=>x.includes("HTTPS")));});
test("does not invent a risk without signals",()=>{const r=analyzeMessage("Bonjour, rendez-vous confirmé demain à 18h.");assert.equal(r.verdict,"ok")});


test("detects shortened URLs",()=>{const r=analyzeMessage("Clique ici https://bit.ly/secure-now");assert.ok(r.reasons.some(x=>x.includes("raccourcissement")));assert.ok(r.verdict!=="ok")});
test("detects bare www URLs",()=>{const r=analyzeMessage("Visitez www.example.com/login");assert.equal(r.urls.length,1)});
test("detects redirect parameters",()=>{const r=analyzeMessage("https://example.com/?redirect=https://other.example");assert.ok(r.reasons.some(x=>x.includes("redirection")))});
