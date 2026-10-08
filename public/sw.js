const BASE=new URL(self.registration.scope).pathname;
const CACHE="verif-v7";
const APP_SHELL=[BASE,BASE+"index.html",BASE+"manifest.webmanifest",BASE+"icon.svg"];
const SHARED=BASE+"__shared";

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
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

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.method==="POST" && url.pathname===BASE+"share"){
    event.respondWith(storeShared(event.request).catch(()=>Response.redirect(BASE+"?shared=1",303)));
    return;
  }

  if(event.request.method!=="GET") return;

  const isDocument=url.pathname===BASE||url.pathname===BASE+"index.html";
  const isAsset=url.pathname.startsWith(BASE+"assets/");

  if(isDocument){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(response.ok && isAsset){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
