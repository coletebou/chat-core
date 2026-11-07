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
export declare const AGENT_HEADERS: {
    readonly event: "x-agent-event";
    readonly delivery: "x-agent-delivery";
    readonly timestamp: "x-agent-timestamp";
    readonly signature: "x-agent-signature";
};
/** How far a delivery's timestamp may be from the receiver's clock, either way. */
export declare const AGENT_SIGNATURE_TOLERANCE_S = 300;
/** The one kind of event there is so far: a message names the agent (or answers one of its messages). */
export type AgentEventType = 'chat.mention';
export interface AgentEventAuthor {
    readonly id: string;
    readonly name: string;
    /** Set when an agent wrote it: its handle. */
    readonly agent: string | null;
}
/** A message as an agent is given it: its words, who wrote it, where it sits in its conversation. */
export interface AgentEventMessage {
    readonly id: string;
    readonly author: AgentEventAuthor;
    readonly text: string;
    readonly createdAt: string;
    /** The message it answers, if any. */
    readonly parentId: string | null;
    /** The first message of its conversation, when it is a reply. */
    readonly threadId: string | null;
    /** How many pictures it holds. */
    readonly pictures: number;
}
/** A picture of the message that named the agent: a short-lived address, fetched with the agent's own token. */
export interface AgentEventImage {
    /** A path (and query) on the chat app's API, good for an hour: GET it from the app's configured address. */
    readonly path: string;
    readonly width: number;
    readonly height: number;
}
/** Version 1 of the event a webhook receives (JSON). */
export interface AgentEventV1 {
    readonly version: 1;
    readonly type: AgentEventType;
    /** The delivery's id, as in its header: the same on every retry. */
    readonly id: string;
    readonly createdAt: string;
    readonly agent: {
        readonly handle: string;
    };
    readonly club: {
        readonly id: string;
        readonly name: string;
    };
    readonly channel: {
        readonly kind: 'general';
    } | {
        readonly kind: 'book';
        readonly bookId: string;
        readonly title: string;
    };
    /** The message that named the agent. */
    readonly message: AgentEventMessage & {
        readonly images: readonly AgentEventImage[];
    };
    /** The conversation before it, oldest first, as the one who sent it may read it. */
    readonly thread: readonly AgentEventMessage[];
    /**
     * Where to answer: POST `{ text, parentId }` to `path`, on the chat app's address as the agent was
     * configured with it (never one an event names), with the agent's bearer token. Only a message
     * delivered to the agent can be answered.
     */
    readonly reply: {
        readonly path: string;
        readonly parentId: string;
    };
}
/** Two strings compared in time that depends only on their length, never on where they first differ. */
export declare function constantTimeEqual(a: string, b: string): boolean;
/** A delivery's signature header value: `v1=` and the hex HMAC-SHA256 of `${timestamp}.${body}`. */
export declare function signAgentWebhook(secret: string, timestamp: number, body: string): Promise<string>;
/** The headers of a delivery of `body` (besides its content type), signed now (or at `now`, in ms). */
export declare function agentWebhookHeaders(input: {
    readonly secret: string;
    readonly body: string;
    readonly event: AgentEventType;
    readonly delivery: string;
    readonly now?: number;
}): Promise<Record<string, string>>;
export interface VerifyAgentWebhook {
    /** The shared secret, or two while one is being changed. */
    readonly secret: string | readonly string[];
    /** The raw body, exactly as received (before any JSON parsing). */
    readonly body: string;
    readonly timestamp: string | null | undefined;
    readonly signature: string | null | undefined;
    /** The receiver's clock, in ms (default: now). */
    readonly now?: number;
    readonly toleranceSeconds?: number;
}
/** Whether a delivery is genuine and fresh: signed with the secret, over this very body, within the tolerance of now. */
export declare function verifyAgentWebhook(input: VerifyAgentWebhook): Promise<boolean>;
/** The token of an `Authorization: Bearer <token>` header, or null. */
export declare function bearerToken(header: string | null | undefined): string | null;
//# sourceMappingURL=agents.d.ts.map