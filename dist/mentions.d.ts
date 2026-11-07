/**
 * @-mentions, parsed from plain text. A message is stored exactly as it was typed (`@Ana`,
 * `@Grant Smith`, `@cal`): no hidden ids in the text, so it reads the same anywhere it is shown,
 * copied or exported. Who a mention names is worked out from the text against a directory of who
 * can be named (a club's members, the agents enabled there), by the one function both ends call:
 * the server, which is the source of truth (it notifies, it dispatches to agents), and the
 * composer, whose autocomplete writes only what that same function will read back as the person
 * picked (`mentionTokenFor` checks).
 *
 * The rules, in order:
 * - An `@` starts a mention only at the start of the text, after whitespace, or after opening
 *   punctuation: never inside a word, an email address (`ana@example.org`) or a path or URL
 *   (`site/@ana`), and never inside an inline code span.
 * - A name is one word or several, separated by single spaces, matched by its folded key
 *   (`nameKey`: case, accents and punctuation do not matter). The longest run of words that is
 *   someone's whole display name wins (`@Grant Smith` is not also `@Grant`).
 * - One word can be a whole display name (strongest), an agent's handle, or a first name (weakest).
 * - A name has to end where the word ends (`@Anaxagoras` does not name Ana, nor `@cal_` Cal), and
 *   a trailing `'s` or `.` is not part of it (`@Ana's`, `@Ana.`).
 * - A key that names two people at its strongest names nobody: it stays plain text rather than
 *   notify the wrong friend. The composer writes a longer, unambiguous form instead.
 */
export type MentionTarget = {
    readonly kind: 'member';
    readonly id: string;
} | {
    readonly kind: 'agent';
    readonly handle: string;
};
export interface MentionCandidate {
    readonly target: MentionTarget;
    /** How the UI names them: a member's display name, an agent's own name. */
    readonly displayName: string;
    /** Agents: the handle they answer to (`cal` in `@cal`); defaults to the target's own. */
    readonly handle?: string;
}
export interface MentionSpan {
    /** UTF-16 index of the `@`. */
    readonly start: number;
    /** UTF-16 index just past the name. */
    readonly end: number;
    readonly target: MentionTarget;
}
interface Entry {
    readonly priority: number;
    readonly targets: MentionTarget[];
}
export interface MentionDirectory {
    readonly candidates: readonly MentionCandidate[];
    /** For each key, who it names at its strongest; more than one there means it names nobody. */
    readonly keys: ReadonlyMap<string, Entry>;
    /** The most words any display name has: how far a typed name may run past its first word. */
    readonly maxWords: number;
}
export declare function sameTarget(a: MentionTarget, b: MentionTarget): boolean;
/** Everyone who can be named, indexed by every key that names them, strongest reading kept. */
export declare function mentionDirectory(candidates: readonly MentionCandidate[]): MentionDirectory;
/** Every mention in a message, in order (UTF-16 spans), resolved against `directory`. */
export declare function findMentions(text: string, directory: MentionDirectory): MentionSpan[];
/** Whether a message's spans name `target` (a bubble that mentions you looks different). */
export declare function mentionsTarget(spans: readonly MentionSpan[], target: MentionTarget): boolean;
/** The distinct targets a message names, in the order they first appear. */
export declare function mentionedTargets(spans: readonly MentionSpan[]): MentionTarget[];
/** The `@name` being typed at the caret, which the composer offers to complete. */
export interface MentionQuery {
    /** UTF-16 index of its `@`. */
    readonly start: number;
    /** Where a pick would end: the caret, or the end of the word the caret is inside. */
    readonly end: number;
    /** What has been typed after the `@` so far (may be empty, may hold up to two spaces). */
    readonly query: string;
}
/** The mention being typed at `caret`, if the caret is at (or inside) one. */
export declare function mentionQueryAt(text: string, caret: number): MentionQuery | null;
/**
 * Who the composer offers for a query: an exact name, then names starting with it, then any of
 * their words starting with it, then names containing it; alphabetical within each, members
 * before agents on a tie. Nobody is offered themselves.
 */
export declare function rankMentionCandidates(query: string, candidates: readonly MentionCandidate[], options?: {
    readonly limit?: number;
    readonly exclude?: MentionTarget | null;
}): MentionCandidate[];
/**
 * What the composer writes after `@` for someone: the shortest form `findMentions` reads back as
 * exactly them, so the server notifies the person who was picked, never a namesake. A first name
 * when it is theirs alone, else the whole display name, else the name run together.
 */
export declare function mentionTokenFor(candidate: MentionCandidate, directory: MentionDirectory): string;
/**
 * Whether some form of a name reads back as this candidate alone. Not when another holds every one
 * (two friends of one whole name; an agent whose handle is a member's whole name, D204): a pick of
 * them would name someone else or no one, so the composer does not offer them.
 */
export declare function mentionable(candidate: MentionCandidate, directory: MentionDirectory): boolean;
/** The text with a picked mention written over the query, and where the caret goes after it. */
export declare function applyMention(text: string, query: MentionQuery, candidate: MentionCandidate, directory: MentionDirectory): {
    text: string;
    caret: number;
};
export type TextSegment = {
    readonly kind: 'text';
    readonly text: string;
} | {
    readonly kind: 'mention';
    readonly text: string;
    readonly target: MentionTarget;
};
/**
 * A message cut into plain runs and mentions, for drawing highlights. Spans come from the server
 * and are trusted only as far as they fit: one out of bounds or overlapping another is skipped.
 */
export declare function segmentText(text: string, spans: readonly MentionSpan[]): TextSegment[];
export {};
//# sourceMappingURL=mentions.d.ts.map