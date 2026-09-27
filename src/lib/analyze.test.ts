import { describe,expect,it } from "vitest";
import { analyzeText } from "./analyze";

describe("analyzeText",()=>{
  it("flags an urgent payment link as stop",()=>{
    const r=analyzeText("Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis");
    expect(r.verdict).toBe("stop");
  });
  it("flags a payment request as caution",()=>{
    const r=analyzeText("Merci d'effectuer un paiement via ce lien https://example.com");
    expect(["caution","check"]).toContain(r.verdict);
  });
  it("does not overstate a normal sentence",()=>{
    const r=analyzeText("Bonjour, rendez-vous confirmé demain à 18h.");
    expect(r.verdict).toBe("ok");
  });
});