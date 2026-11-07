/** Newest first: later `createdAt` first, ties broken by the larger id (as SQL's `ORDER BY ... DESC`). */
export function newestFirst(a, b) {
    if (a.createdAt !== b.createdAt)
        return a.createdAt < b.createdAt ? 1 : -1;
    return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
}
function withCount(message, delta) {
    return { ...message, replyCount: Math.max(0, (message.replyCount ?? 0) + delta) };
}
/** Each held reply to `parentId`, brought up to date by `requote`. */
function requoteAll(messages, parentId, parent, requote) {
    if (!requote || !messages.some((m) => m.parentId === parentId))
        return messages;
    return messages.map((m) => (m.parentId === parentId ? requote(m, parent) : m));
}
/**
 * A message arrived (sent, pushed live, edited, reacted to): insert it in order if it is new, or
 * replace the copy held. A new reply bumps its root's count; a reply that turns into a deleted
 * placeholder takes one off. Replies quoting it are brought up to date (`requote`).
 */
export function upsertMessage(page, message, options = {}) {
    const index = page.messages.findIndex((m) => m.id === message.id);
    let messages;
    if (index === -1) {
        const at = page.messages.findIndex((m) => newestFirst(message, m) < 0);
        // Older than everything held while more exists further back: it belongs to a page not
        // loaded yet, where it will turn up when that page is. Replies held that quote it still
        // learn of the change (an old parent edited or deleted while its replies are on screen).
        if (at === -1 && page.hasMore && page.messages.length > 0) {
            const requoted = requoteAll(page.messages, message.id, message, options.requote);
            return requoted === page.messages ? page : { ...page, messages: requoted };
        }
        messages = at === -1 ? [...page.messages, message] : [...page.messages.slice(0, at), message, ...page.messages.slice(at)];
        if (message.threadId && !message.deleted)
            messages = messages.map((m) => (m.id === message.threadId ? withCount(m, 1) : m));
    }
    else {
        const existing = page.messages[index];
        if (options.keepExisting?.(existing, message))
            return page;
        const merged = existing.replyCount !== undefined && message.replyCount === undefined ? { ...message, replyCount: existing.replyCount } : message;
        messages = page.messages.map((m, i) => (i === index ? merged : m));
        if (message.threadId && message.deleted && !existing.deleted)
            messages = messages.map((m) => (m.id === message.threadId ? withCount(m, -1) : m));
    }
    messages = requoteAll(messages, message.id, message, options.requote);
    return { ...page, messages };
}
/**
 * A message is gone (deleted with nothing left in its thread to anchor). Its root, if it was a
 * reply, counts one fewer; replies quoting it learn it is gone. `threadId` is for when the list
 * no longer holds the message itself but its root still needs the count corrected.
 */
export function removeMessage(page, id, options = {}) {
    const held = page.messages.find((m) => m.id === id);
    const threadId = held ? held.threadId : (options.threadId ?? null);
    const counted = !held || !held.deleted;
    let messages = page.messages.filter((m) => m.id !== id);
    if (threadId && counted)
        messages = messages.map((m) => (m.id === threadId ? withCount(m, -1) : m));
    messages = requoteAll(messages, id, null, options.requote);
    if (messages.length === page.messages.length && messages.every((m, i) => m === page.messages[i]))
        return page;
    return { ...page, messages };
}
/** An older page fetched ("load earlier"): appended after what is held, never a message twice. */
export function appendOlder(page, older) {
    const held = new Set(page.messages.map((m) => m.id));
    const fresh = older.messages.filter((m) => !held.has(m.id));
    return { messages: [...page.messages, ...fresh].sort(newestFirst), hasMore: older.hasMore };
}
/**
 * The newest page fetched again (a refetch on focus, a reconnect) over what is held: the fresh
 * page is the truth for its own span, newest back to its oldest; anything older that "load
 * earlier" brought in stays, so a refetch never throws away what someone scrolled back through.
 * Only when the two meet, though: a fresh page that ends after the newest held message (more
 * arrived while nothing was pushed, a long time asleep) would leave a gap no "earlier" could fill,
 * so then the fresh page is all there is.
 */
export function refreshNewest(held, fresh) {
    const oldest = fresh.messages.at(-1);
    const heldNewest = held?.messages[0];
    if (!held || !oldest || !heldNewest || !fresh.hasMore || newestFirst(oldest, heldNewest) < 0)
        return fresh;
    const older = held.messages.filter((m) => newestFirst(m, oldest) > 0);
    return older.length === 0 ? fresh : { messages: [...fresh.messages, ...older], hasMore: held.hasMore };
}
/** The oldest message held: the cursor for asking for the page before it. */
export function oldestHeld(page) {
    return page.messages.at(-1);
}
/** Every message of one thread held in a list (root first, then replies oldest first). */
export function threadOf(messages, rootId) {
    return messages.filter((m) => m.id === rootId || m.threadId === rootId).sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : -newestFirst(a, b)));
}
/**
 * Consecutive messages from one person, close enough together, read as one turn: a messaging
 * app's own convention (a reply among them too: its quote already marks the new beat). Oldest
 * first in, oldest first out.
 */
export function groupRuns(oldestFirst, authorOf, windowMs = 5 * 60 * 1000) {
    const at = (m) => Date.parse(m.createdAt);
    const joins = (prev, m) => !!prev && !!m && authorOf(prev) === authorOf(m) && at(m) - at(prev) <= windowMs;
    return oldestFirst.map((message, i) => ({
        message,
        showHeader: !joins(oldestFirst[i - 1], message),
        showTime: !joins(message, oldestFirst[i + 1]),
    }));
}
//# sourceMappingURL=messages.js.map