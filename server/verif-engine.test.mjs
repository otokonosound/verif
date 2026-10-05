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


test("detects lookalike official domain",()=>{const r=analyzeMessage("Votre compte Ameli: https://amelii.fr/connexion");assert.ok(r.reasons.some(x=>x.includes("ressemble")));assert.equal(r.verdict,"stop")});
test("recognizes added official registry",()=>{const r=analyzeMessage("Information CAF: https://caf.fr/");assert.equal(r.urls[0].official,"CAF")});


test("extracts sender identity and detects lookalike domain",()=>{const r=analyzeMessage("De : Assurance Ameli <support@amelii.fr>\nVotre compte est bloqué https://amelii.fr/connexion");assert.equal(r.identity.senderDomain,"amelii.fr");assert.equal(r.identity.status,"lookalike");assert.equal(r.intent,"credentials");assert.ok(r.evidence.senderDomain)});
test("recognizes an official sender domain",()=>{const r=analyzeMessage("Expéditeur: contact@caf.fr\nInformation CAF: https://caf.fr/");assert.equal(r.identity.status,"official");assert.equal(r.identity.senderDomain,"caf.fr");});
test("flags public mailbox impersonation",()=>{const r=analyzeMessage("De : CAF <caf-assistance@gmail.com>\nRemboursement disponible");assert.ok(r.reasons.some(x=>x.includes("messagerie grand public")));assert.ok(r.verdict!=="ok")});


test("detects Reply-To mismatch",()=>{const r=analyzeMessage("From: CAF <contact@caf.fr>\nReply-To: fraude@gmail.com\nInformation CAF");assert.ok(r.reasons.some(x=>x.includes("Reply-To")));assert.equal(r.evidence.headers.receivedCount,0)});
test("captures technical URL findings",()=>{const r=analyzeMessage("https://example.com:8443/a/b/c/d/e");assert.ok(r.evidence.urlFindings.some(x=>x.includes("port réseau inhabituel")));assert.ok(r.evidence.urlFindings.some(x=>x.includes("sous-domaines"))===false)});
