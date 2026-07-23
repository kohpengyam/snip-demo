# snip-cli

Zero-dependency Node.js CLI for the [Snip](https://github.com/kohpengyam/snip-demo) URL shortener.

## Usage

```
snip add <url>      Shorten a URL and print the short link
snip ls             List all shortened links (code / hits / original URL)
snip open <code>    Open the original URL in the OS browser
snip help           Show help text
```

## Running

```bash
node cli.js help
node cli.js add https://github.com
node cli.js ls
node cli.js open <code>
```

Or, after `npm link` / placing the folder on `$PATH`:

```bash
snip add https://github.com
snip ls
snip open <code>
```

## Environment

| Variable   | Default                  | Description              |
|------------|--------------------------|--------------------------|
| `SNIP_API` | `http://localhost:3000`  | Backend base URL         |

## Notes

- Zero npm dependencies — uses Node ≥18 global `fetch` and `child_process`.
- CommonJS (`require`/`module.exports`) — **no `"type": "module"`** in `package.json`.  
  A later build step bundles this file into a CommonJS folder; adding ESM would break it.
- Errors print to `stderr` and exit with code `1`.
