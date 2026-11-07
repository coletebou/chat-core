/**
 * The message and thread model: what the core needs to know of a message to keep a live list of
 * them right, and the pure functions that do it. An app's own message type carries much more
 * (text, author, spoiler state, reactions); these functions read only the fields below and copy
 * everything else through untouched, so the same reducers serve any app's view of a message.
 *
 * Threads are messaging-app replies: a reply names the message it answers (`parentId`) and the
 * first message of its conversation (`threadId`, the root, however deep the chain of replies),
 * and appears in the stream like any other message, with a quote of what it answers. A root
 * counts its thread's live replies (`replyCount`), so a list can say "3 replies" and open the
 * thread on its own.
 */
export interface ThreadedMessage {
    readonly id: string;
    /** The message this one answers, if it is a reply. */
    readonly parentId: string | null;
    /** The first message of its conversation, if it is a reply (null on a root). */
    readonly threadId: string | null;
    /** ISO-8601 (UTC, `Z`): lists are kept in this order, ties by id. */
    readonly createdAt: string;
    /** On a root: how many live replies its thread has. */
    readonly replyCount?: number;
    /** Deleted, kept as a placeholder because its thread still has live replies. */
    readonly deleted?: boolean;
}
/** One page or more of a conversation as a client holds it: newest first, as servers send it. */
export interface MessagePage<T> {
    readonly messages: T[];
    /** Whether older messages exist beyond the last one held. */
    readonly hasMore: boolean;
}
/** Newest first: later `createdAt` first, ties broken by the larger id (as SQL's `ORDER BY ... DESC`). */
export declare function newestFirst(a: Pick<ThreadedMessage, 'createdAt' | 'id'>, b: Pick<ThreadedMessage, 'createdAt' | 'id'>): number;
export interface UpsertOptions<T> {
    /**
     * Keep what is held instead of the incoming copy (an app's own rule, e.g. "never let a late,
     * hidden copy replace a revealed one"). The incoming copy is used when this is absent.
     */
    readonly keepExisting?: (existing: T, incoming: T) => boolean;
    /**
     * A reply held in the list whose parent just changed (edited, deleted, revealed): return it
     * with its quote of that parent brought up to date. `parent` is null when the parent is gone.
     */
    readonly requote?: (reply: T, parent: T | null) => T;
}
/**
 * A message arrived (sent, pushed live, edited, reacted to): insert it in order if it is new, or
 * replace the copy held. A new reply bumps its root's count; a reply that turns into a deleted
 * placeholder takes one off. Replies quoting it are brought up to date (`requote`).
 */
export declare function upsertMessage<T extends ThreadedMessage>(page: MessagePage<T>, message: T, options?: UpsertOptions<T>): MessagePage<T>;
/**
 * A message is gone (deleted with nothing left in its thread to anchor). Its root, if it was a
 * reply, counts one fewer; replies quoting it learn it is gone. `threadId` is for when the list
 * no longer holds the message itself but its root still needs the count corrected.
 */
export declare function removeMessage<T extends ThreadedMessage>(page: MessagePage<T>, id: string, options?: {
    readonly threadId?: string | null;
    readonly requote?: UpsertOptions<T>['requote'];
}): MessagePage<T>;
/** An older page fetched ("load earlier"): appended after what is held, never a message twice. */
export declare function appendOlder<T extends ThreadedMessage>(page: MessagePage<T>, older: MessagePage<T>): MessagePage<T>;
/**
 * The newest page fetched again (a refetch on focus, a reconnect) over what is held: the fresh
 * page is the truth for its own span, newest back to its oldest; anything older that "load
 * earlier" brought in stays, so a refetch never throws away what someone scrolled back through.
 * Only when the two meet, though: a fresh page that ends after the newest held message (more
 * arrived while nothing was pushed, a long time asleep) would leave a gap no "earlier" could fill,
 * so then the fresh page is all there is.
 */
export declare function refreshNewest<T extends ThreadedMessage>(held: MessagePage<T> | undefined, fresh: MessagePage<T>): MessagePage<T>;
/** The oldest message held: the cursor for asking for the page before it. */
export declare function oldestHeld<T extends ThreadedMessage>(page: MessagePage<T>): T | undefined;
/** Every message of one thread held in a list (root first, then replies oldest first). */
export declare function threadOf<T extends ThreadedMessage>(messages: readonly T[], rootId: string): T[];
export interface Run<T> {
    readonly message: T;
    /** First of its run: shows who wrote it (avatar, name). */
    readonly showHeader: boolean;
    /** Last of its run: a small time caption trails it. */
    readonly showTime: boolean;
}
/**
 * Consecutive messages from one person, close enough together, read as one turn: a messaging
 * app's own convention (a reply among them too: its quote already marks the new beat). Oldest
 * first in, oldest first out.
 */
export declare function groupRuns<T extends ThreadedMessage>(oldestFirst: readonly T[], authorOf: (m: T) => string, windowMs?: number): Run<T>[];
//# sourceMappingURL=messages.d.ts.map