// The built package as a consumer gets it: plain Node, no bundler, no TypeScript, through the
// package's own name and `exports` map (both entry points). Run after `pnpm build`.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { findMentions, mentionDirectory } from '@coletebou/chat-core';
import { signAgentWebhook, verifyAgentWebhook } from '@coletebou/chat-core/agents';

const directory = mentionDirectory([
  { target: { kind: 'member', id: 'u1' }, displayName: 'Ana' },
  { target: { kind: 'agent', handle: 'cal' }, displayName: 'Cal', handle: 'cal' },
]);
const spans = findMentions('@Ana have you asked @cal?', directory);
assert.deepEqual(spans.map((s) => s.target), [{ kind: 'member', id: 'u1' }, { kind: 'agent', handle: 'cal' }]);

const { vectors } = JSON.parse(readFileSync(new URL('../fixtures/agents/webhook-v1.json', import.meta.url), 'utf8'));
for (const v of vectors) {
  assert.equal(await signAgentWebhook(v.secret, v.timestamp, v.body), v.signature, v.name);
  assert.equal(await verifyAgentWebhook({ secret: v.secret, body: v.body, timestamp: String(v.timestamp), signature: v.signature, now: v.timestamp * 1000 }), true, v.name);
}
console.log(`dist smoke ok on Node ${process.versions.node}: ${spans.length} mentions, ${vectors.length} signature vectors`);
