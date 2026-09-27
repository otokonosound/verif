import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMessage } from "./verif-engine.mjs";

test("detects urgent payment phishing", () => {
  const r = analyzeMessage("Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis");
  assert.equal(r.verdict, "stop");
  assert.ok(r.reasons.length >= 2);
});

test("detects brand/domain mismatch", () => {
  const r = analyzeMessage("Votre remboursement Ameli est disponible : https://example.com/remboursement");
  assert.equal(r.verdict, "stop");
  assert.match(r.reasons.join(" "), /ameli\.fr/);
});

test("does not invent a risk without signals", () => {
  const r = analyzeMessage("Bonjour, rendez-vous confirmé demain à 18h.");
  assert.equal(r.verdict, "ok");
});
