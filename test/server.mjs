import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

createServer((request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^\//, "");
  const filename = join(root, relative || "test/harness.html");
  if (!filename.startsWith(root) || !existsSync(filename)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types[extname(filename)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(filename).pipe(response);
}).listen(4173, "127.0.0.1", () => console.log("HearthPane test server on http://127.0.0.1:4173"));
