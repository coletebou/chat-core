# @coletebou/chat-core

The parts of a small group chat that belong to no particular app: who an `@` names and how a
composer offers names, how a live, paged, threaded list of messages stays right as messages
arrive, change and go, the composer's own state, and the signed webhooks that let agents of other
services take part. [Book Club](https://github.com/coletebou/book-club) is its first user; it
began there and moved here so any project can use it.

Decision numbers (D200-D205) refer to Book Club's
[`docs/DECISIONS.md`](https://github.com/coletebou/book-club/blob/master/docs/DECISIONS.md),
where the design was argued.

- **No runtime dependencies.** Not React, not zod, nothing. Types are structural; an app's own
  message type passes through untouched.
- **No platform.** No Node built-ins, no `process`, no `Buffer`, no DOM. It runs the same in Node,
  Bun, a browser, a Worker or React Native. `src/boundary.test.ts` fails the build otherwise.
- **No app.** Nothing here imports an app's code. Rules an app has of its own (Book Club's "never
  let a hidden copy replace one you can read") are passed in as arguments.

## What is here

| Module | What it does |
|---|---|
| `text.ts` | `nameKey` (the folded key a name is matched by), `foldForSearch`, `collapseSpaces`, `snippet` (a message cut to a quote, never splitting a word or an emoji when it can help it) |
| `mentions.ts` | `mentionDirectory` (who can be named, and by which keys), `findMentions` (the spans a message's `@`s name, the source of truth), `mentionQueryAt` / `rankMentionCandidates` / `mentionTokenFor` / `applyMention` (autocomplete), `segmentText` (runs and mentions, for drawing highlights) |
| `messages.ts` | The thread model (`ThreadedMessage`: `parentId`, `threadId`, `replyCount`) and pure reducers over newest-first pages: `upsertMessage`, `removeMessage`, `appendOlder`, `refreshNewest`, `threadOf`, `groupRuns` |
| `store.ts` | `createStore`: one immutable snapshot, `getState` and `subscribe` as arrow properties |
| `composer.ts` | `createComposerStore`: text, caret, the message being answered, the @-mention picker and the pictures added, driven by what the person does; `canSend`, `readyAttachmentIds` |
| `agents.ts` | Agents of other services (D205): the event an agent's webhook receives (`AgentEventV1`), its four headers, `signAgentWebhook` / `verifyAgentWebhook` (HMAC-SHA256 over `${timestamp}.${body}`, five minutes' tolerance, two secrets while one changes) and `bearerToken`. An event names paths on the app's API, never an address: the agent joins them to the address it was configured with. Web Crypto only: the agent's side can import `@coletebou/chat-core/agents` in any runtime |
| `attachments.ts` | The composer's pictures (`ComposerAttachment`: a slot per picture in pick order, uploading, ready or failed) and `imageFilesFrom` (the pictures in a paste or a drop, structurally typed) |

## The mention rules

A message is stored as typed. An `@` starts a mention only at the start of the text, after
whitespace or after opening punctuation, never inside a word, an email address, a path or an
inline code span. A name may run to several words, and the longest run that is someone's whole
display name wins. One word may be a whole display name (strongest), an agent's handle, or a first
name (weakest). A name ends where its word does, without a trailing `'s` or full stop. Case, accents
and punctuation fold away. A key that names two people at its strongest names nobody, and
`mentionTokenFor` writes a longer form that names one. Both ends call `findMentions`: the server to
notify, the composer to check that what it writes reads back as the person picked.

## Install

It is not on npm. Install a tagged release from GitHub; each tag carries its built `dist/`, so
nothing is compiled on install:

```sh
pnpm add github:coletebou/chat-core#v0.1.0
# or: npm install github:coletebou/chat-core#v0.1.0
```

ES modules with TypeScript declarations, two entry points: `@coletebou/chat-core` (everything)
and `@coletebou/chat-core/agents` (the agent protocol alone, for an agent's own service). Plain
Node 20 or later, Bun, Deno, browsers, Workers and React Native, with or without a bundler.

## Using it

```ts
import { createComposerStore, findMentions, mentionDirectory, upsertMessage } from '@coletebou/chat-core';

// Who can be named in this conversation.
const directory = mentionDirectory([
  { target: { kind: 'member', id: 'u1' }, displayName: 'Ana' },
  { target: { kind: 'agent', handle: 'cal' }, displayName: 'Cal', handle: 'cal' },
]);

// Server: who a message names (to notify them, and to send the spans with the message).
const spans = findMentions('@Ana have you asked @cal?', directory);

// Client: keep a list live. Book Club passes its own rules in.
const next = upsertMessage(page, incoming, { keepExisting: (held, inc) => !held.hidden && inc.hidden });

// Client: the composer, outside any framework.
const composer = createComposerStore<{ id: string }>({ directory: () => directory });
composer.input('hi @a', 5); // composer.getState().mention holds the picker
```

In React, `useSyncExternalStore(composer.subscribe, composer.getState)`.

## Who uses it

- **Book Club** (`apps/server/src/services/chat.ts`, `apps/web/src/lib/chat-model.ts`,
  `apps/web/src/live/ChatComposer.tsx`): the server builds each club's directory and reads every
  message's mentions with `findMentions`; the web app keeps each channel and thread live with
  `upsertMessage`, `removeMessage`, `appendOlder` and `refreshNewest`, and draws
  `createComposerStore`'s snapshot; agents are signed with `agents.ts`.

## Develop

```sh
pnpm install
pnpm test            # vitest, offline (fetch throws in tests)
pnpm typecheck
pnpm build           # dist/, from scratch
pnpm smoke           # the built package through its own exports, in plain Node
```

`dist/` is committed: after changing `src/`, run `pnpm build` and commit both (CI's
`check:dist` fails otherwise). A release is a version bump in `package.json` and a `vX.Y.Z` tag.

## Limits and known gaps

- A name that begins another member's whole name, followed by the rest of it, reads as the
  longer name: with an Ana and an Ana Bell in the club, `@Ana bell rang` names Ana Bell. Plain
  text cannot tell the two apart; a structured token could, at the cost D201 rejects.
- Mentions are read in UTF-16 offsets, which is what JavaScript strings index by; a client in
  another language must count the same way.

## Licence

MIT, see [LICENSE](LICENSE). Before v0.1.0 this code was part of Book Club, under AGPL-3.0-only;
its author relicensed it to MIT when it moved here.
