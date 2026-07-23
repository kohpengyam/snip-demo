# snip-demo

One backend, two clients — a tiny URL shortener demoing a **git submodule** architecture.

```
snip-demo/
├── backend/    Bun API server (zero deps, in-memory Map)   ← branch: backend
├── frontend/   Angular 19 web app                         ← branch: frontend
├── cli/        zero-dep Node CLI                          ← branch: cli
├── bundle/     GENERATED release (server + built UI + CLI) ← branch: bundle
├── scripts/build-bundle.mjs                               ← assembles bundle/
└── main        this superproject (.gitmodules + README)   ← branch: main
```

Each layer lives on its own orphan branch (independent history, files at the branch
root). The `main` branch mounts them all as submodules — git gitlinks pin each folder
to an exact commit on its branch.

---

## API contract

Served by the backend on `:3000`; consumed by both the Angular app and the CLI.
**Change it everywhere at once, or not at all.**

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` · `400` on bad input |
| `GET`  | `/api/links` | — | `200` array of all links |
| `GET`  | `/:code` | — | `302` redirect to original URL (+1 hit) · `404` if unknown |

---

## Cloning

A plain `git clone` leaves the submodule folders empty. Always use:

```bash
git clone --recurse-submodules https://github.com/kohpengyam/snip-demo
```

Or, if you already cloned without the flag:

```bash
git submodule update --init --recursive
```

---

## Running

Three terminals from the `main` checkout:

```bash
# Terminal 1 — backend API on :3000
cd backend && bun start

# Terminal 2 — Angular dev server on :4200
cd frontend && npm install && npx ng serve

# Terminal 3 — CLI (talks to backend on :3000)
cd cli && node cli.js ls
cd cli && node cli.js add https://example.com
cd cli && node cli.js open <code>
```

Override the backend URL with `SNIP_API`:

```bash
SNIP_API=https://my-deployed-api.example.com node cli/cli.js ls
```

---

## Update workflow

Submodules need two commits: one inside the submodule (advances its branch), and one
in the superproject (bumps the gitlink pointer).

```bash
# 1. Edit inside the submodule folder
cd backend
# ... make changes ...
git add -A && git commit -m "Fix: ..."
git push                          # advances origin/backend

# 2. Bump the pointer in the superproject
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Without the pointer bump, `main` still pins the old commit.

---

## Branch layout

| Branch | Content | Notes |
|--------|---------|-------|
| `backend` | `server.js`, `package.json`, `README.md` | Bun 1.x, zero npm deps |
| `frontend` | Angular 19 app (`src/`, `angular.json`, …) | Build → `dist/snip-frontend/browser` |
| `cli` | `cli.js`, `package.json`, wrappers, `README.md` | Node ≥18, CommonJS, zero npm deps |
| `bundle` | **Generated** release: `server.js`, `cli.js`, `public/`, `Dockerfile` | Do not hand-edit — overwritten by build script |
| `main` | `.gitmodules`, `README.md`, `scripts/` | Superproject — submodule pointers + build script |

## Rebuilding the bundle

```bash
node scripts/build-bundle.mjs          # assemble locally (dry run)
node scripts/build-bundle.mjs --push   # assemble + push bundle branch + bump pointer on main
```

The script:
1. Updates `backend`, `frontend`, `cli` submodules to their branch tips
2. Runs `npm install && ng build` in `frontend`
3. Assembles `bundle/` — `server.js`, `cli.js`, `public/` (built UI), `.env`, `package.json`, `Dockerfile`, `.dockerignore`, `railway.json`
4. Commits inside `bundle/` and bumps the pointer on `main` — both **guarded**: if nothing changed, no commit is made (safe no-op for hourly CI)
