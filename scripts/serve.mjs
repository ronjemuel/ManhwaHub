import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const args = process.argv;
const p = args.indexOf("--port");
const port = Number(p >= 0 ? args[p + 1] : process.env.PORT || 4173);
const types = {
  ".html": "text/html",
  ".txt": "text/x-component",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};
const root = path.resolve("out");
http
  .createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let relative = decodeURIComponent(url.pathname);
      let target = path.resolve(root, "." + relative);
      if (!target.startsWith(root + path.sep) && target !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(target) && fs.statSync(target).isDirectory())
        target = path.join(target, "index.html");
      if (!fs.existsSync(target)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(fs.readFileSync(path.join(root, "404.html")));
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(target).pipe(res);
    } catch {
      res.writeHead(500);
      res.end("Could not load page.");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log("ManhwaHub production preview listening on", port),
  );
