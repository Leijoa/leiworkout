// Bump VERSION whenever any shell file changes. Cache is scoped to this installation.
const VERSION = 'v3.1.0';
const PREFIX = `leiworkout-${encodeURIComponent(self.registration.scope)}-`;
const CACHE = PREFIX + VERSION;
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./core.js", "./storage.js", "./guides.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./MEDIA-LICENSES.md", "./media/calf-stretch.jpg", "./media/cat.jpg", "./media/child-pose.jpg", "./media/cow.jpg", "./media/credits.json", "./media/dead-bug.svg", "./media/dumbbell-row.png", "./media/goblet-squat.svg", "./media/heel-touch.svg", "./media/kneeling-wheel.svg", "./media/low-cobra.svg", "./media/march.svg", "./media/mobility.svg", "./media/plank.png", "./media/quad-stretch.png", "./media/rdl.webp", "./media/relaxation.svg", "./media/reverse-crunch.svg", "./media/rope-jump.svg", "./media/side-step.svg", "./media/standing-press.svg"];
const urls = new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  // Updated workers wait: an active training must never change code halfway through.
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url = new URL(event.request.url);
  if(!url.href.startsWith(self.registration.scope))return;
  if(urls.has(url.href)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
  } else if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));
  }
});
