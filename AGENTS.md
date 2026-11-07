# @coletebou/chat-core: guide for coding agents

A framework-agnostic chat core — mentions, threaded messages, a composer store, attachments, and
signed agent webhooks — with zero runtime dependencies, extracted from [Book
Club](https://github.com/coletebou/book-club) so any project can use it. [README.md](README.md) is
the real documentation (module list, the mention rules, usage examples); this file is what an agent
needs on top of it. `CLAUDE.md` only imports this file — edit this one.

## Read before changing behaviour

- [README.md](README.md), especially "The mention rules" — a terse spec for `findMentions`, the
  module everything else about `@`-mentions depends on.
- Book Club's [`docs/DECISIONS.md`](https://github.com/coletebou/book-club/blob/master/docs/DECISIONS.md)
  `D200`-`D205` for the design rationale behind choices this package makes.

## Hard rules

- **No runtime dependencies, no platform API, no app import, anywhere outside a test file.**
  `src/boundary.test.ts` enforces this by scanning every non-test source file for `node:*` imports,
  `process`, `Buffer`, `document`/`window`, `@bookclub/...`, `react`, and any non-relative import —
  it fails the build, not just a lint warning. If you need something Node/DOM-specific, it belongs
  in a test file or it doesn't belong here.
- **`dist/` is committed and must be exactly what `src/` builds to.** After any `src/` change, run
  `pnpm build` and commit `dist/` too — CI's `check:dist` rebuilds from scratch and fails on any
  diff. A release is a `package.json` version bump plus a `vX.Y.Z` tag (tags carry their built
  `dist/`, so installing one builds nothing).
- **Tests run offline.** `src/test/no-network.ts` makes `fetch` throw; a test that needs the network
  injects a fake instead of hitting a real one.
- Coverage thresholds in `vitest.config.ts` (`lines`/`statements`/`functions` 90%, `branches` 80%)
  are enforced by `pnpm test:coverage` in CI — don't drop below them without deliberately lowering
  the threshold and saying why.
- Public, MIT-licensed repo. No secrets, no private hostnames or personal paths in commits.
- Never skip, weaken or delete a test to get green; change one only when the intended behavior
  changed.
- No formatter (no Prettier). Match the surrounding style.

## Where things are, and what a change can break

| Module | Depends on | A change here can break |
|---|---|---|
| `src/text.ts` | nothing | `mentions.ts` (`foldForSearch`), any snippet rendering |
| `src/mentions.ts` | `text.ts` | message-notify logic on the server side, the composer's `@`-autocomplete and its own validation that a written mention reads back correctly |
| `src/messages.ts` | nothing | every app's live, paged, threaded message list (`upsertMessage`, `appendOlder`, `refreshNewest`, `threadOf`) |
| `src/store.ts` | nothing | `composer.ts`'s snapshot/subscribe mechanics |
| `src/composer.ts` | `mentions.ts`, `attachments.ts`, `store.ts` | every app's composer UI state |
| `src/attachments.ts` | nothing | the composer's picture-upload state |
| `src/agents.ts` | Web Crypto only | the HMAC signature agents of other services verify (`signAgentWebhook`/`verifyAgentWebhook`) — a change here can silently break every agent integration without failing a type check |
| `src/index.ts` | everything above | both public entry points (`@coletebou/chat-core`, `@coletebou/chat-core/agents`) |

## Checks

```sh
pnpm install --frozen-lockfile
pnpm test                 # vitest run, offline, all of src/**/*.test.ts
pnpm test -- src/mentions.test.ts    # one file
pnpm typecheck             # tsc -p tsconfig.json
pnpm build && pnpm check:dist   # rebuild dist/ from scratch and diff it against what's committed
pnpm smoke                  # the built package through its own exports, in plain Node
```

- **The full gate is `.github/workflows/check.yml`**, on every push to `master`, every `v*` tag, and
  every pull request: a `node: [22, 24]` matrix (`pnpm typecheck`, `pnpm test:coverage`,
  `pnpm check:dist`, `pnpm smoke`), plus a `dist-on-node-20` job that runs only `node
  scripts/smoke.mjs` on Node 20 with nothing installed — proving the oldest supported `engines`
  entry works with zero runtime dependencies. There's no `workflow_dispatch`; trigger it by pushing
  a branch or opening a PR, then `gh run watch <id> --exit-status`.

## Known traps

- `tsconfig.json`'s `types: ["node"]` and `lib: [..., "DOM"]` exist only so **test files** can use
  Node's test-runner types and so `src/` can reference the Web Crypto/`TextEncoder` global types —
  they don't license actually calling a Node or DOM API from `src/`; `boundary.test.ts` will still
  fail the build.
- Forgetting `pnpm build` after editing `src/` is the single most common CI failure here
  (`check:dist`) — it's a silent diff, not a type error, so it won't show up until CI runs.
- `scripts/build.mjs` deletes `dist/` before rebuilding, so a stale file from a module you removed
  won't linger — don't rely on incremental `tsc` output surviving a rename.
