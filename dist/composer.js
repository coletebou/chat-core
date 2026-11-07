import { applyMention, mentionQueryAt, mentionable, mentionTokenFor, rankMentionCandidates, sameTarget, } from './mentions.js';
import {} from './attachments.js';
import { createStore } from './store.js';
/** Whether there is something to send: words, or a picture that came through, and nothing still uploading. */
export function canSend(state) {
    if (state.attachments.some((a) => a.status === 'uploading'))
        return false;
    return state.text.trim().length > 0 || state.attachments.some((a) => a.status === 'ready');
}
/** The server ids of the pictures that came through, in the order they were picked. */
export function readyAttachmentIds(state) {
    return state.attachments.flatMap((a) => (a.status === 'ready' && a.id ? [a.id] : []));
}
export function createComposerStore(options) {
    const store = createStore({ text: '', caret: 0, replyTo: null, mention: null, attachments: [] });
    let nextKey = 1;
    const patch = (key, change) => store.set((s) => (s.attachments.some((a) => a.key === key) ? { ...s, attachments: s.attachments.map((a) => (a.key === key ? { ...a, ...change } : a)) } : s));
    /**
     * The mention the person just completed or dismissed: its picker stays closed while what is
     * typed there still starts with what it held then (so it does not reopen on the space after a
     * pick), and opens again once they edit back into it or type a new `@`.
     */
    let quiet = null;
    const pickerFor = (text, caret, previous) => {
        if (quiet && text[quiet.start] !== '@')
            quiet = null;
        const query = mentionQueryAt(text, caret);
        if (!query)
            return null;
        if (quiet && query.start === quiet.start && query.query.startsWith(quiet.prefix))
            return null;
        quiet = null;
        const directory = options.directory();
        // Only whom a pick would name: never someone the server would read as someone else.
        const offered = directory.candidates.filter((c) => mentionable(c, directory));
        const candidates = rankMentionCandidates(query.query, offered, { limit: options.limit ?? 6, exclude: options.self?.() ?? null });
        if (candidates.length === 0)
            return null;
        // Keep the highlight on the same person while the list narrows around them.
        const was = previous && previous.query.start === query.start ? previous.candidates[previous.active] : undefined;
        const kept = was ? candidates.findIndex((c) => sameTarget(c.target, was.target)) : -1;
        return { query, candidates, active: kept === -1 ? 0 : kept };
    };
    return {
        getState: store.getState,
        subscribe: store.subscribe,
        input: (text, caret) => store.set((s) => (s.text === text && s.caret === caret ? s : { ...s, text, caret, mention: pickerFor(text, caret, s.mention) })),
        move: (delta) => store.set((s) => {
            if (!s.mention)
                return s;
            const n = s.mention.candidates.length;
            return { ...s, mention: { ...s.mention, active: (((s.mention.active + delta) % n) + n) % n } };
        }),
        pick: (index) => {
            const s = store.getState();
            const picker = s.mention;
            const candidate = picker?.candidates[index ?? picker.active];
            if (!picker || !candidate)
                return null;
            const directory = options.directory();
            const next = applyMention(s.text, picker.query, candidate, directory);
            quiet = { start: picker.query.start, prefix: mentionTokenFor(candidate, directory) };
            store.set({ ...s, text: next.text, caret: next.caret, mention: null });
            return next;
        },
        dismiss: () => {
            const s = store.getState();
            if (!s.mention)
                return;
            quiet = { start: s.mention.query.start, prefix: s.mention.query.query };
            store.set({ ...s, mention: null });
        },
        replyTo: (target) => store.set((s) => (s.replyTo === target ? s : { ...s, replyTo: target })),
        addAttachments: (files, max = Number.POSITIVE_INFINITY) => {
            const room = Math.max(0, max - store.getState().attachments.length);
            const added = files.slice(0, room).map((f) => ({ key: `a${nextKey++}`, name: f.name, status: 'uploading', id: null, preview: f.preview ?? null, error: null }));
            if (added.length > 0)
                store.set((s) => ({ ...s, attachments: [...s.attachments, ...added] }));
            return added.map((a) => a.key);
        },
        attachmentReady: (key, id) => patch(key, { status: 'ready', id, error: null }),
        attachmentFailed: (key, error) => patch(key, { status: 'failed', error }),
        removeAttachment: (key) => {
            const taken = store.getState().attachments.find((a) => a.key === key) ?? null;
            if (taken)
                store.set((s) => ({ ...s, attachments: s.attachments.filter((a) => a.key !== key) }));
            return taken;
        },
        clear: () => {
            quiet = null;
            store.set({ text: '', caret: 0, replyTo: null, mention: null, attachments: [] });
        },
        refresh: () => store.set((s) => ({ ...s, mention: pickerFor(s.text, s.caret, s.mention) })),
    };
}
//# sourceMappingURL=composer.js.map