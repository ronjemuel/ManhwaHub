import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const files = fs
  .readdirSync("out", { recursive: true })
  .filter(
    (f) =>
      fs.statSync(path.join("out", f)).isFile() &&
      !f.startsWith("demo/") &&
      !f.endsWith(".map") &&
      f !== "sw.js",
  );
const urls = files.map((f) => "/" + f.replaceAll("\\", "/"));
const version = crypto
  .createHash("sha256")
  .update(files.map((f) => fs.readFileSync(path.join("out", f))).join(""))
  .digest("hex")
  .slice(0, 12);
const sw = `const SHELL='manhwahub-shell-${version}';const PRECACHE=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('manhwahub-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
if(url.pathname.startsWith('/demo/')){event.respondWith(caches.open('manhwahub-demo-v1').then(c=>c.match(req,{ignoreSearch:true})).then(hit=>hit||fetch(req)));return;}
if(req.mode==='navigate'){event.respondWith(fetch(req).catch(async()=>{const c=await caches.open(SHELL);let p=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;return await c.match(p)||await c.match('/index.html');}));return;}
if(url.pathname.startsWith('/_next/')||url.pathname.endsWith('.txt')||PRECACHE.includes(url.pathname)){event.respondWith(caches.open(SHELL).then(async c=>(await c.match(req,{ignoreSearch:true}))||fetch(req)));}
});`;
fs.writeFileSync("out/sw.js", sw);
console.log("Offline shell:", urls.length, "files; version", version);
