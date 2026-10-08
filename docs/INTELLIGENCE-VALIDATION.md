# Intelligence 2.1 — integration and validation

The production app, extension popup and `/api/analyze` now use the same deterministic source (`src/lib/analyze.ts` and `intelligence.ts`). `npm run build:engine` bundles it into the extension and Node entry points. The older exported server/page analyzers remain for backwards compatibility; they do not drive these production paths.

## Evidence boundaries

- Standalone prevention advice is separated from actionable requests. URL evidence is retained even when nearby prose is negated.
- Domains use the Public Suffix List (`tldts`), including private hosting suffixes. Official domains require exact label boundaries.
- Pasted authentication headers cannot reduce risk. They are declarations, not verified authentication.
- Repeated URL findings and repeated domain ages do not accumulate as independent evidence. DNS outages do not increase risk. Missing provider data is not reported as successful research.
- Local AI is used only when the browser reports an already available model. No automatic model download. Sessions have deadlines and are destroyed on failure. An AI opinion cannot reduce deterministic risk or establish STOP by itself.
- DNS/RDAP enrichment is opt-in. Only public domain names are sent to fixed services. Suspect URLs are no longer opened automatically: HTTP probes and redirects can trigger tracking or actions. The extension still analyzes the visible active page locally.
- Optional server analysis has a separate content-sharing choice. Search uses Brave or configured SearXNG, with cited results in the UI. A result must mention the exact target domain, come from a recognized source and avoid obvious negation/question formulations to count as an indicator. Snippets are not definitive reputation proof.
- Incident reports and actions reflect the final merged verdict. A failed enrichment retains the deterministic result.

## Validation

Run `npm ci`, `npm run validate`, `npx playwright install chromium`, then `npm run test:e2e`.

Validation includes TypeScript, the original regression suites, additional hybrid calibration cases, actual HTTP startup and requests, classic-script popup execution, AI lifecycle failures, runtime syntax, PWA/extension manifests, production build and browser tests for offline analysis, provider failure and text import. GitHub Pages runs these gates before uploading the built artifact. `version.json` records the deployed Git SHA. The installable extension is included at `downloads/verif-extension.zip`.

These are regression tests, not an independently labelled real-world accuracy benchmark. No universal precision/recall percentage is claimed. OCR, camera, Android share and Gmail/Outlook retain their existing implementation; full device/webmail acceptance testing remains necessary. The local AI lifecycle is tested with doubles; actual model availability depends on the browser and hardware.

## Deployment and remaining configuration

GitHub Pages hosts the app and extension download. It cannot run the Node API or store server secrets. To enable full web search, deploy `npm run api` on a Node host with `CORS_ORIGIN`, `BRAVE_SEARCH_API_KEY` or `SEARXNG_URL`, and optionally `HF_TOKEN`; then build the PWA with `VITE_VERIF_API_URL`. Until configured, the UI offers local analysis and opt-in public DNS/RDAP and does not claim full search is active.

The old vulnerable npm SheetJS 0.18.5 is replaced by the official 0.20.3 tarball, following [SheetJS installation instructions](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). At implementation time the remaining npm audit findings were moderate issues in Mammoth's CLI dependency chain (`argparse` / `sprintf-js`); no downgrade is applied because it would remove modern DOCX fixes. The app imports the browser bundle. Review upstream before a wider release.

Browser API behavior follows the [Chrome Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api).
