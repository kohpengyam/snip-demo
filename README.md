# snip-backend

Tiny URL shortener backend. Single-file Bun server, zero npm dependencies, in-memory storage.

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` · `400` on bad input |
| `GET`  | `/api/links` | — | `200` array of all links |
| `GET`  | `/:code` | — | `302` redirect (+1 hit) · `404` if unknown |

## Running

```bash
bun start          # production
bun run dev        # watch mode
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | `http://localhost:<PORT>` | Origin used in `shortUrl`; falls back to `https://$RAILWAY_PUBLIC_DOMAIN` when set |
| `PUBLIC_DIR` | — | When set, serves static files from this folder (`/` → `index.html`); a matching file wins over a short code |

## Notes

- Codes are 6 random base62 characters.
- Storage is an in-memory `Map` — restarts clear all links by design.
- CORS is fully open (any origin).
