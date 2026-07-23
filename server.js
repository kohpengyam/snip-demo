// Snip — tiny URL shortener (Bun, zero npm deps)

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

/** @type {Map<string, { code: string, url: string, shortUrl: string, hits: number, createdAt: string }>} */
const links = new Map();

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function randomCode(len = 6) {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) code += BASE62[b % 62];
  return code;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;
  const { join } = await import("path");
  const { existsSync } = await import("fs");
  const filePath = pathname === "/" ? join(PUBLIC_DIR, "index.html") : join(PUBLIC_DIR, pathname);
  if (!existsSync(filePath)) return null;
  return new Response(Bun.file(filePath));
}

async function handler(req) {
  const url = new URL(req.url);
  const { pathname } = url;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // POST /api/links
  if (req.method === "POST" && pathname === "/api/links") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const rawUrl = body?.url;
    if (typeof rawUrl !== "string") {
      return json({ error: "Missing url field" }, 400);
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return json({ error: "Invalid URL" }, 400);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json({ error: "URL must use http or https" }, 400);
    }

    let code;
    do { code = randomCode(); } while (links.has(code));

    const entry = {
      code,
      url: rawUrl,
      shortUrl: `${BASE_URL}/${code}`,
      hits: 0,
      createdAt: new Date().toISOString(),
    };
    links.set(code, entry);
    return json(entry, 201);
  }

  // GET /api/links
  if (req.method === "GET" && pathname === "/api/links") {
    return json([...links.values()]);
  }

  // Static files win over short codes when PUBLIC_DIR is set
  if (req.method === "GET") {
    const staticResponse = await serveStatic(pathname);
    if (staticResponse) return staticResponse;
  }

  // GET /:code  — redirect
  if (req.method === "GET" && pathname.length > 1) {
    const code = pathname.slice(1);
    const entry = links.get(code);
    if (entry) {
      entry.hits++;
      return new Response(null, {
        status: 302,
        headers: { ...CORS_HEADERS, Location: entry.url },
      });
    }
    return json({ error: "Not found" }, 404);
  }

  // Root — serve index.html if PUBLIC_DIR set, else 404
  if (req.method === "GET" && pathname === "/") {
    const staticResponse = await serveStatic("/");
    if (staticResponse) return staticResponse;
  }

  return json({ error: "Not found" }, 404);
}

Bun.serve({ port: PORT, fetch: handler });
console.log(`Snip backend listening on port ${PORT}  BASE_URL=${BASE_URL}`);
