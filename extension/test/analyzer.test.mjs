import assert from "node:assert/strict";
import { analyzePage } from "../analyzer.js";

const cases=[
  ["site normal","https://example.com/","Example","Bienvenue", "ok"],
  ["IP directe","http://185.10.20.30/login","Connexion","", "check"],
  ["raccourcisseur","https://bit.ly/abc","Lien","", "check"],
  ["France Travail usurpé","https://france-travail-secure.example/login","France Travail","Connectez-vous immédiatement", "stop"],
  ["PayPal usurpé","https://paypal-verification.example/login","PayPal","Confirmez votre carte bancaire", "stop"],
  ["exécutable","https://example.com/facture.apk","Facture","Télécharger", "stop"],
  ["punycode","https://xn--exmple-cua.com","Compte","", "caution"],
  ["HTTPS officiel","https://ameli.fr/","Ameli","Bienvenue", "ok"]
];
for(const [name,url,title,text,expected] of cases){
  const a=analyzePage({url,title,text});
  assert.equal(a.verdict,expected, name+" => "+a.verdict+" au lieu de "+expected);
}
console.log("VÉRIF extension: "+cases.length+" tests passés.");