import { collapseSpaces, foldForSearch, nameKey } from './text.js';
/** How strongly a key names someone: a whole display name, an agent's handle, a first name. */
const FULL = 3;
const HANDLE = 2;
const FIRST = 1;
/** How many words a typed name may run to (no friend's display name is longer). */
const MAX_WORDS = 5;
export function sameTarget(a, b) {
    if (a.kind === 'member')
        return b.kind === 'member' && a.id === b.id;
    return b.kind === 'agent' && a.handle === b.handle;
}
function handleOf(candidate) {
    return candidate.handle ?? (candidate.target.kind === 'agent' ? candidate.target.handle : '');
}
function wordsOf(name) {
    return collapseSpaces(name).split(' ').filter(Boolean);
}
/** A display name's words as they can be typed after an `@`: an emoji or punctuation at either end of one dropped. */
function typableWords(name) {
    return wordsOf(name)
        .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''))
        .filter(Boolean);
}
/** Everyone who can be named, indexed by every key that names them, strongest reading kept. */
export function mentionDirectory(candidates) {
    const keys = new Map();
    const add = (key, priority, target) => {
        if (!key)
            return;
        const entry = keys.get(key);
        if (!entry || entry.priority < priority)
            keys.set(key, { priority, targets: [target] });
        else if (entry.priority === priority && !entry.targets.some((t) => sameTarget(t, target)))
            entry.targets.push(target);
    };
    let maxWords = 1;
    for (const c of candidates) {
        if (c.target.kind === 'agent') {
            add(nameKey(handleOf(c)), HANDLE, c.target);
            continue;
        }
        const words = wordsOf(c.displayName);
        maxWords = Math.max(maxWords, Math.min(words.length, MAX_WORDS));
        add(nameKey(c.displayName), FULL, c.target);
        if (words.length > 1)
            add(nameKey(words[0]), FIRST, c.target);
    }
    return { candidates, keys, maxWords };
}
/** What may stand right before an `@` for it to start a mention: whitespace or opening punctuation. */
const OPENER = /[\s([{"'“‘«<,;:!?¡¿*~]/u;
/** One word of a name: letters and digits (and the marks scripts like Devanagari and Thai write vowels with), with `_ ' ’ . -` allowed inside but never at its end. */
const WORD = /[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}_'’.-]*[\p{L}\p{N}\p{M}])?/uy;
/** A character that would carry a word on: a name cannot end right before one. */
const NAME_CHAR = /[\p{L}\p{N}\p{M}_]/u;
const POSSESSIVE = /['’]s$/u;
const CODE_SPAN = /`[^`\n]*`/gu;
/** The text with its inline code spans blanked out (same length, so every index stays true). */
function withoutCode(text) {
    return text.includes('`') ? text.replace(CODE_SPAN, (span) => ' '.repeat(span.length)) : text;
}
function wordsFrom(text, from, max) {
    const words = [];
    let at = from;
    while (words.length < max) {
        WORD.lastIndex = at;
        const match = WORD.exec(text);
        if (!match)
            break;
        const end = at + match[0].length;
        words.push({ start: at, end });
        const gap = text[end];
        // Words of one name are joined by a single space (or the no-break space some keyboards type).
        if ((gap !== ' ' && gap !== '\u00a0') || end + 1 >= text.length)
            break;
        at = end + 1;
    }
    return words;
}
function readName(text, at, words, directory) {
    for (let n = words.length; n >= 1; n--) {
        const first = words[0];
        const last = words[n - 1];
        const raw = text.slice(first.start, last.end);
        // A trailing 's is a possessive before it is part of a name (@Ana's book names Ana, even
        // with an Anas in the club).
        const tries = POSSESSIVE.test(raw) ? [[raw.slice(0, -2), last.end - 2], [raw, last.end]] : [[raw, last.end]];
        for (const [name, end] of tries) {
            if (end < text.length && NAME_CHAR.test(text[end]))
                continue;
            const entry = directory.keys.get(nameKey(name));
            if (!entry)
                continue;
            // A run of several words only ever names someone by their whole display name.
            if (n > 1 && entry.priority !== FULL)
                continue;
            if (entry.targets.length !== 1)
                return { ambiguous: true };
            return { span: { start: at, end, target: entry.targets[0] } };
        }
    }
    return null;
}
/** Every mention in a message, in order (UTF-16 spans), resolved against `directory`. */
export function findMentions(text, directory) {
    const spans = [];
    const plain = withoutCode(text);
    let from = 0;
    for (;;) {
        const at = plain.indexOf('@', from);
        if (at === -1)
            break;
        from = at + 1;
        if (at > 0 && !OPENER.test(plain[at - 1]))
            continue;
        const reading = readName(plain, at, wordsFrom(plain, at + 1, directory.maxWords), directory);
        if (reading && 'span' in reading) {
            spans.push(reading.span);
            from = reading.span.end;
        }
    }
    return spans;
}
/** Whether a message's spans name `target` (a bubble that mentions you looks different). */
export function mentionsTarget(spans, target) {
    return spans.some((s) => sameTarget(s.target, target));
}
/** The distinct targets a message names, in the order they first appear. */
export function mentionedTargets(spans) {
    const out = [];
    for (const s of spans)
        if (!out.some((t) => sameTarget(t, s.target)))
            out.push(s.target);
    return out;
}
/** Up to three words of a name being typed, with the space after one of them typed already. */
const TYPING = /^(?:[\p{L}\p{N}][\p{L}\p{N}\p{M}_'’.-]*(?: [\p{L}\p{N}][\p{L}\p{N}\p{M}_'’.-]*){0,2} ?)?$/u;
const WORD_TAIL = /[\p{L}\p{N}\p{M}_'’.-]/u;
const QUERY_REACH = 64;
/** The mention being typed at `caret`, if the caret is at (or inside) one. */
export function mentionQueryAt(text, caret) {
    if (caret < 0 || caret > text.length)
        return null;
    const reach = text.slice(Math.max(0, caret - QUERY_REACH), caret);
    const offset = reach.lastIndexOf('@');
    if (offset === -1)
        return null;
    const start = caret - reach.length + offset;
    if (start > 0 && !OPENER.test(text[start - 1]))
        return null;
    const query = text.slice(start + 1, caret);
    if (!TYPING.test(query))
        return null;
    let end = caret;
    while (end < text.length && WORD_TAIL.test(text[end]))
        end++;
    return { start, end, query };
}
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
function scoreName(name, q) {
    if (name === q)
        return 0;
    if (name.startsWith(q))
        return 1;
    if (!q.includes(' ') && name.split(' ').some((w) => w.startsWith(q)))
        return 2;
    if (name.replaceAll(' ', '').startsWith(q.replaceAll(' ', '')))
        return 2;
    if (name.includes(q))
        return 3;
    return null;
}
function score(candidate, q) {
    if (q === '')
        return 0;
    const names = [foldForSearch(candidate.displayName)];
    const handle = handleOf(candidate);
    if (handle)
        names.push(foldForSearch(handle));
    let best = null;
    for (const name of names) {
        const s = scoreName(name, q);
        if (s !== null && (best === null || s < best))
            best = s;
    }
    return best;
}
/**
 * Who the composer offers for a query: an exact name, then names starting with it, then any of
 * their words starting with it, then names containing it; alphabetical within each, members
 * before agents on a tie. Nobody is offered themselves.
 */
export function rankMentionCandidates(query, candidates, options = {}) {
    const q = foldForSearch(query);
    const scored = [];
    for (const c of candidates) {
        if (options.exclude && sameTarget(c.target, options.exclude))
            continue;
        const s = score(c, q);
        if (s !== null)
            scored.push({ c, s });
    }
    scored.sort((a, b) => a.s - b.s ||
        collator.compare(a.c.displayName, b.c.displayName) ||
        (a.c.target.kind === b.c.target.kind ? 0 : a.c.target.kind === 'member' ? -1 : 1));
    return scored.slice(0, options.limit ?? 8).map((x) => x.c);
}
/**
 * What the composer writes after `@` for someone: the shortest form `findMentions` reads back as
 * exactly them, so the server notifies the person who was picked, never a namesake. A first name
 * when it is theirs alone, else the whole display name, else the name run together.
 */
export function mentionTokenFor(candidate, directory) {
    const tries = tokenTries(candidate);
    return tries.find((token) => readsBackAs(token, candidate, directory)) ?? tries.at(-1) ?? '';
}
/** The forms of a name the composer can write, shortest first. */
function tokenTries(candidate) {
    if (candidate.target.kind === 'agent')
        return [handleOf(candidate)].filter(Boolean);
    const words = typableWords(candidate.displayName);
    return [words[0] ?? '', words.join(' '), words.join('')].filter(Boolean);
}
function readsBackAs(token, candidate, directory) {
    const spans = findMentions(`@${token} `, directory);
    return spans.length === 1 && spans[0].start === 0 && spans[0].end === token.length + 1 && sameTarget(spans[0].target, candidate.target);
}
/**
 * Whether some form of a name reads back as this candidate alone. Not when another holds every one
 * (two friends of one whole name; an agent whose handle is a member's whole name, D204): a pick of
 * them would name someone else or no one, so the composer does not offer them.
 */
export function mentionable(candidate, directory) {
    return tokenTries(candidate).some((token) => readsBackAs(token, candidate, directory));
}
/** The text with a picked mention written over the query, and where the caret goes after it. */
export function applyMention(text, query, candidate, directory) {
    const token = mentionTokenFor(candidate, directory);
    const after = text.slice(query.end);
    const insert = `@${token}${/^\s/u.test(after) ? '' : ' '}`;
    const caret = query.start + insert.length + (after.startsWith(' ') ? 1 : 0);
    return { text: text.slice(0, query.start) + insert + after, caret };
}
/**
 * A message cut into plain runs and mentions, for drawing highlights. Spans come from the server
 * and are trusted only as far as they fit: one out of bounds or overlapping another is skipped.
 */
export function segmentText(text, spans) {
    const sorted = spans.filter((s) => s.start >= 0 && s.start < s.end && s.end <= text.length).sort((a, b) => a.start - b.start);
    const out = [];
    let at = 0;
    for (const s of sorted) {
        if (s.start < at)
            continue;
        if (s.start > at)
            out.push({ kind: 'text', text: text.slice(at, s.start) });
        out.push({ kind: 'mention', text: text.slice(s.start, s.end), target: s.target });
        at = s.end;
    }
    if (at < text.length)
        out.push({ kind: 'text', text: text.slice(at) });
    return out;
}
//# sourceMappingURL=mentions.js.map