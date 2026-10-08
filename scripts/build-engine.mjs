import { build } from 'esbuild';
const common = { entryPoints: ['src/lib/engine-entry.ts'], bundle: true, target: 'es2022', legalComments: 'none' };
await build({ ...common, format: 'iife', globalName: 'VERIF_CORE', outfile: 'extension/core.js' });
await build({ ...common, format: 'esm', platform: 'node', outfile: 'server/core.mjs' });
