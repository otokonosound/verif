import http from "node:http";
import { URL } from "node:url";
import { analyzeMessage } from "./verif-engine.mjs";

const port = Number(process.env.PORT || 8787);
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    res.setHeader("content-type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: true, service: "verif-api", version: "0.2.0" }));
  }
  if (req.method === "POST" && url.pathname === "/api/analyze") {
    let body = "";
    for await (const chunk of req) { body += chunk; if (body.length > 100_000) break; }
    try {
      const data = JSON.parse(body || "{}");
      if (typeof data.text !== "string" || !data.text.trim()) {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "text_required" }));
      }
      const result = analyzeMessage(data.text);
      res.setHeader("content-type", "application/json; charset=utf-8");
      return res.end(JSON.stringify(result));
    } catch {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "invalid_json" }));
    }
  }
  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "not_found" }));
});
server.listen(port, () => console.log(`VÉRIF API listening on :${port}`));
