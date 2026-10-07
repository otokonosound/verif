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
  items:[],
  searchResults:[{title:"Alerte phishing young.example",snippet:"arnaque et fraude signalée",url:"https://example.test"}]
});
assert.ok(flagged.evidence.risk>=2);
console.log("VÉRIF server research: tests passés.");
