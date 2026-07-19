# Masir (مسیر)

Static RTL Persian PWA study planner for Iranian grade 11/12 students. Vanilla JS (ES modules), HTML, CSS. No backend, no database, no login — all state lives in browser LocalStorage.

## Cursor Cloud specific instructions

- No dependencies to install: `package.json` declares zero runtime/dev deps and there is no lockfile. `npm install` is effectively a no-op but is kept as the startup update script for idempotency.
- Runtimes are pre-installed on the VM: Node.js (for tests) and Python 3 (for the dev server).
- Run the app: `npm start` (serves the repo root via `python3 -m http.server 4173 --bind 127.0.0.1`). Open `http://127.0.0.1:4173`. Must be served over HTTP — opening `index.html` via `file://` breaks ES module imports.
- No hot reload and no build step: refresh the browser after edits; deploy is just serving the repo root statically.
- Run tests: `npm test` (`node tests/run.mjs`) runs the scenario matrix (grade × field × exam-news × strength × suggestions) plus rebuild-stability checks. Same runner is exposed in-browser via Settings → "اجرای تست سناریوها".
- No linter, TypeScript, or bundler is configured in this repo; `npm test` is the primary automated check.
