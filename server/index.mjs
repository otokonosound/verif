import { createApiServer } from './http.mjs';
const port=Number(process.env.PORT||8787);
createApiServer({limit:Number(process.env.RATE_LIMIT||30)}).listen(port,()=>console.log(`VÉRIF API listening on :${port}`));
