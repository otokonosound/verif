const BASE=new URL(self.registration.scope).pathname;
const CACHE="verif-v8";
// Filled at build time (scripts/release.mjs) with the entry script and stylesheet, so the app opens offline after the first visit.
const BUILD_ASSETS=[/*__PRECACHE__*/];
const INDEX=BASE+"index.html";
const APP_SHELL=[BASE,INDEX,BASE+"manifest.webmanifest",BASE+"icon.svg"];
const OPTIONAL_SHELL=[BASE+"icon-192.png",BASE+"icon-512.png",...BUILD_ASSETS.map(path=>BASE+path)];
const SHARED=BASE+"__shared";

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP_SHELL).then(()=>Promise.allSettled(OPTIONAL_SHELL.map(url=>cache.add(url)))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('verif-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function storeShared(request){
  const form=await request.formData();
  const payload={
    title:String(form.get("title")||""),
    text:String(form.get("text")||""),
    url:String(form.get("url")||""),
    file:null
  };
  const files=form.getAll("files").filter(v=>v instanceof File && v.size);
  const file=files[0];
  if(file){
    const MAX=12*1024*1024;
    if(file.size<=MAX){
      const bytes=new Uint8Array(await file.arrayBuffer());
      let binary="";
      const CHUNK=0x8000;
      for(let i=0;i<bytes.length;i+=CHUNK){
        binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+CHUNK,bytes.length)));
      }
      payload.file={name:file.name,type:file.type,size:file.size,base64:btoa(binary)};
    }else{
      payload.file={name:file.name,type:file.type,size:file.size,tooLarge:true};
    }
  }
  const cache=await caches.open(CACHE);
  await cache.put(SHARED,new Response(JSON.stringify(payload),{headers:{"Content-Type":"application/json"}}));
  return Response.redirect(BASE+"?shared=1",303);
}

function remember(request,response){
  if(response&&response.ok){
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
  }
  return response;
}

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.method==="POST" && url.pathname===BASE+"share"){
    event.respondWith(storeShared(event.request).catch(()=>Response.redirect(BASE+"?shared=1",303)));
    return;
  }

  if(event.request.method!=="GET") return;

  // Shared content only ever lives in the cache: never ask the network for it.
  if(url.pathname===SHARED){
    event.respondWith(caches.match(SHARED).then(cached=>cached||new Response("null",{status:404,headers:{"Content-Type":"application/json"}})));
    return;
  }

  const isDocument=event.request.mode==="navigate"||url.pathname===BASE||url.pathname===INDEX;
  if(isDocument){
    // Network first so a new release is picked up; the cached shell answers offline whatever the query string.
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok&&(url.pathname===BASE||url.pathname===INDEX)) remember(INDEX,response);
          return response;
        })
        .catch(()=>caches.match(INDEX).then(cached=>cached||caches.match(BASE)).then(cached=>cached||Response.error()))
    );
    return;
  }

  // Hashed build files never change: serve them from the cache, fetch and keep them otherwise.
  if(url.pathname.startsWith(BASE+"assets/")){
    event.respondWith(
      caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>remember(event.request,response)))
    );
    return;
  }

  // Manifest, icons and other static files: answer from the cache and refresh in the background.
  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>remember(event.request,response));
      if(cached){ network.catch(()=>{}); return cached; }
      return network;
    })
  );
});
