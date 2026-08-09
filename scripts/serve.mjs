import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "dist");
const base = "/pytorch-deep-learning";
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/") { response.writeHead(302, { Location: `${base}/` }); response.end(); return; }
  let relative = decodeURIComponent(url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname);
  let file = path.join(root, relative);
  try { if ((await stat(file)).isDirectory()) file = path.join(file, "index.html"); } catch { file = path.join(root, "404.html"); response.statusCode = 404; }
  response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`Local URL: http://127.0.0.1:${port}${base}/`));
