# Web frontend M8: npm workspaces + check:clients

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the repo into an npm workspace so `@erp/*` uses `workspace:*`, then run `npm run check:clients` in CI.

**Architecture:** `docs/dev-laraval/architecture/web-frontend.md` §12 / M8.

**Tech stack:** npm workspaces, Node 22, GitHub Actions.

---

### Task 1: Root workspaces

- [x] Add `"workspaces": ["apps/*", "packages/*", "modules/*"]` to root `package.json`.
- [x] Switch `setup:clients` / `check:clients` to `npm install` and `npm -w` (no `--prefix` for those scripts).
- [x] Track root `package-lock.json` (keep nested lockfiles ignored).
- [x] Keep `.npmrc` `ignore-scripts=true` and `engine-strict=false`. Do **not** use `install-strategy=nested` — npm 11 treats `workspace:*` as an unsupported URL under nested installs.

### Task 2: `workspace:*` protocol

- [x] Replace every `@erp/*` `file:` dependency with `"*"` (npm 11 rejects `workspace:*` as `EUNSUPPORTEDPROTOCOL`).
- [x] Add `check` scripts: web = lint + typecheck + check:zones; mobile = eslint (workspace binary, not `expo lint`) + typecheck; miniapp = typecheck.

### Task 3: CI

- [x] Add `.github/workflows/clients.yml` that `npm ci` at root then `npm run check:clients`.
- [x] Point front-nav workflow npm install at the workspace root.

### Task 4: Verify

- [x] `npm install` at root succeeds.
- [x] `npm run check:clients` passes.
- [x] Architecture M8 marked done.
