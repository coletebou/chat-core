/**
 * Agents in a chat, as another service sees them (D205): a message that names an agent is
 * delivered to it as an event, POSTed to the agent's own webhook; the agent answers through the
 * chat app's API with a bearer token of its own. This module is that protocol's shape and its
 * signing, for both ends: the app signs what it sends, the agent checks it, with nothing but the
 * Web platform (Web Crypto, TextEncoder), so it runs the same in Node, Bun, Deno, a Worker or a
 * browser.
 *
 * A delivery carries four headers (`AGENT_HEADERS`): what it is (`chat.mention`), its id (the same
 * on every retry of it, so a receiver can drop a repeat), when it was signed (Unix seconds), and
 * its signature: `v1=` and the hex HMAC-SHA256, keyed by the secret the two share, of
 * `${timestamp}.${body}`, the exact bytes sent. A receiver checks the signature over the raw body
 * before parsing it, and refuses a timestamp more than five minutes from its own clock, so a
 * delivery caught on the way cannot be replayed later. While a secret is being changed the
 * signature header may carry two `v1=` values, one for each; either one matching will do.
 *
 * Every address an event gives is a path on the chat app's own API (`reply.path`, an image's
 * `path`), never a whole URL: the agent puts in front of it the address it was configured with
 * for the app, and sends its token there and nowhere else. An origin taken from a request (its Host
 * header) could otherwise name any host, and the agent would hand that host its token.
 */
export const AGENT_HEADERS = {
    event: 'x-agent-event',
    delivery: 'x-agent-delivery',
    timestamp: 'x-agent-timestamp',
    signature: 'x-agent-signature',
};
/** How far a delivery's timestamp may be from the receiver's clock, either way. */
export const AGENT_SIGNATURE_TOLERANCE_S = 300;
const encoder = new TextEncoder();
function hex(bytes) {
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hmacHex(secret, data) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}
/** Two strings compared in time that depends only on their length, never on where they first differ. */
export function constantTimeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
/** A delivery's signature header value: `v1=` and the hex HMAC-SHA256 of `${timestamp}.${body}`. */
export async function signAgentWebhook(secret, timestamp, body) {
    return `v1=${await hmacHex(secret, `${timestamp}.${body}`)}`;
}
/** The headers of a delivery of `body` (besides its content type), signed now (or at `now`, in ms). */
export async function agentWebhookHeaders(input) {
    const timestamp = Math.floor((input.now ?? Date.now()) / 1000);
    return {
        [AGENT_HEADERS.event]: input.event,
        [AGENT_HEADERS.delivery]: input.delivery,
        [AGENT_HEADERS.timestamp]: String(timestamp),
        [AGENT_HEADERS.signature]: await signAgentWebhook(input.secret, timestamp, input.body),
    };
}
/** Whether a delivery is genuine and fresh: signed with the secret, over this very body, within the tolerance of now. */
export async function verifyAgentWebhook(input) {
    const timestamp = input.timestamp?.trim() ?? '';
    if (!/^\d{1,12}$/u.test(timestamp))
        return false;
    const seconds = Number(timestamp);
    const now = (input.now ?? Date.now()) / 1000;
    if (Math.abs(now - seconds) > (input.toleranceSeconds ?? AGENT_SIGNATURE_TOLERANCE_S))
        return false;
    const offered = (input.signature ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.startsWith('v1='));
    if (offered.length === 0)
        return false;
    const secrets = typeof input.secret === 'string' ? [input.secret] : input.secret;
    let match = false;
    for (const secret of secrets) {
        if (!secret)
            continue;
        const expected = await signAgentWebhook(secret, seconds, input.body);
        // Every candidate compared, so the time taken says nothing about which one matched.
        for (const candidate of offered)
            match = constantTimeEqual(candidate, expected) || match;
    }
    return match;
}
/** The token of an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(header) {
    const match = /^Bearer\s+(\S+)\s*$/iu.exec(header ?? '');
    return match ? match[1] : null;
}
//# sourceMappingURL=agents.js.map