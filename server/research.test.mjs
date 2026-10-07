import assert from "node:assert/strict";
import { __test } from "./research.mjs";

assert.ok(__test.ageDays(new Date(Date.now()-10*86400000).toISOString())>=9);

const base={
  verdict:"ok",
  title:"OK",
  summary:"Aucun signal",
  reasons:[],
  evidence:{risk:0},
  urls:[{url:"https://young.example",host:"young.example"}]
};
const research={
  provider:"test",
  items:[{host:"young.example",findings:["Domaine enregistré très récemment (3 jours)."]}],
  searchResults:[]
};
const enriched=__test.applyResearchEvidence(base,research);
assert.notEqual(enriched.verdict,"ok");
assert.ok(enriched.evidence.risk>=3);

const flagged=__test.applyResearchEvidence(base,{
  provider:"test",
  items:[{host:"young.example",findings:[]}],
  searchResults:[{title:"young.example — phishing détecté",snippet:"Domaine malveillant signalé",url:"https://urlscan.io/domain/young.example"}]
});
assert.ok(flagged.evidence.risk>=3);

const untrusted=__test.applyResearchEvidence(base,{
  provider:"test",
  items:[{host:"young.example",findings:[]}],
  searchResults:[{title:"young.example est-il une arnaque ?",snippet:"discussion phishing sans preuve",url:"https://random-blog.example/post"}]
});
assert.equal(untrusted.evidence.risk,0);
assert.equal(untrusted.verdict,"ok");

assert.equal(__test.trustedSearchEvidence({title:"young.example phishing",snippet:"malicious",url:"https://urlscan.io/domain/young.example"},"young.example"),true);
assert.equal(__test.trustedSearchEvidence({title:"young.example phishing",snippet:"malicious",url:"https://random-blog.example"},"young.example"),false);
console.log("VÉRIF server research: tests passés.");
