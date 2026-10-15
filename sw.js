const C='uticad-v3',A=['./','index.html','manifest.webmanifest','vendor/three.module.js','vendor/OrbitControls.js','vendor/RoomEnvironment.js','butts/','butts/index.html','lhm/','lhm/index.html','lhm/app.js','lhm/spec.json','icon-192.png','app-icon-512.png','apple-touch-icon.png','favicon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(n=>{const cl=n.clone();caches.open(C).then(c=>c.put(e.request,cl));return n}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
