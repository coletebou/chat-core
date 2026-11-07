import { type MentionCandidate, type MentionDirectory, type MentionQuery, type MentionTarget } from './mentions.js';
import { type ComposerAttachment } from './attachments.js';
import { type Store } from './store.js';
/**
 * The composer's state, kept outside any UI framework: what is typed, where the caret is, which
 * message is being answered, the @-mention picker, and the pictures added (attachments.ts). The UI renders the snapshot and reports
 * what the person did (`input`, `move`, `pick`, `dismiss`, `replyTo`); everything about which
 * mention is being typed, who is offered and what a pick writes is decided here, by the same
 * mention rules the server reads messages with (mentions.ts).
 */
export interface MentionPicker {
    readonly query: MentionQuery;
    readonly candidates: readonly MentionCandidate[];
    /** The highlighted candidate's index. */
    readonly active: number;
}
export interface ComposerState<R> {
    readonly text: string;
    readonly caret: number;
    /** The message being answered, as the app describes it (shown above the input), or null. */
    readonly replyTo: R | null;
    /** The open mention picker, or null. */
    readonly mention: MentionPicker | null;
    /** Pictures added, in the order they were picked. */
    readonly attachments: readonly ComposerAttachment[];
}
/** Whether there is something to send: words, or a picture that came through, and nothing still uploading. */
export declare function canSend(state: Pick<ComposerState<unknown>, 'text' | 'attachments'>): boolean;
/** The server ids of the pictures that came through, in the order they were picked. */
export declare function readyAttachmentIds(state: Pick<ComposerState<unknown>, 'attachments'>): string[];
export interface ComposerStore<R> extends Store<ComposerState<R>> {
    /** The text or the caret changed: typing, a paste, a tap or arrow key moving the caret. */
    readonly input: (text: string, caret: number) => void;
    /** Move the picker's highlight (-1 up, +1 down), wrapping at either end. */
    readonly move: (delta: number) => void;
    /** Pick the highlighted candidate (or the one at `index`): the field's new text and caret, or null with no picker open. */
    readonly pick: (index?: number) => {
        text: string;
        caret: number;
    } | null;
    /** Close the picker for the name being typed (Escape); it stays closed while that name is typed on. */
    readonly dismiss: () => void;
    /** Start answering a message, or stop (null). */
    readonly replyTo: (target: R | null) => void;
    /**
     * Add pictures (a pick, a paste, a drop), each in a slot of its own in the order given, as many as
     * still fit under `max`: their keys, to report each upload's outcome by. Those past the limit are
     * not added (the returned list is shorter).
     */
    readonly addAttachments: (files: readonly {
        readonly name: string;
        readonly preview?: string | null;
    }[], max?: number) => string[];
    /** An upload came through: its server id. */
    readonly attachmentReady: (key: string, id: string) => void;
    /** An upload did not: why. */
    readonly attachmentFailed: (key: string, error: string) => void;
    /** Take a picture out: the one taken (for the app to free its preview and discard its upload), or null. */
    readonly removeAttachment: (key: string) => ComposerAttachment | null;
    /** After a send: no text, no reply, no picker, no pictures. */
    readonly clear: () => void;
    /** Rank the open picker again (who can be mentioned changed). */
    readonly refresh: () => void;
}
export interface ComposerOptions {
    /** Who can be mentioned right now (read on every keystroke, so it can change). */
    readonly directory: () => MentionDirectory;
    /** Who is writing: never offered themselves. */
    readonly self?: () => MentionTarget | null;
    /** How many candidates the picker shows at most (default 6). */
    readonly limit?: number;
}
export declare function createComposerStore<R>(options: ComposerOptions): ComposerStore<R>;
//# sourceMappingURL=composer.d.ts.map