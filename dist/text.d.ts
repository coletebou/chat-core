/**
 * Text helpers every part of the core shares: how a name is folded for matching, and how a long
 * message is cut to a quote. Pure, no platform APIs.
 */
/**
 * The key a name is matched by: accents folded away (`Zoë` -> `zoe`), lower case, and everything
 * that is not a letter or a digit dropped (`Mary-Jane O'Neil` -> `maryjaneoneil`). Two spellings a
 * person would call the same name get the same key; that is the whole contract.
 */
export declare function nameKey(name: string): string;
/** A name or a query folded for prefix search: accents gone, lower case, single spaces, no ends. */
export declare function foldForSearch(text: string): string;
/** A display name with its runs of whitespace made single spaces, as it is shown and typed. */
export declare function collapseSpaces(text: string): string;
/**
 * A message cut down to a one-line quote: whitespace folded, at most `max` characters, cut at a
 * word boundary when one is near enough (else mid-word), with an ellipsis when anything was cut.
 * Counted in code points, so an emoji is never split in half.
 */
export declare function snippet(text: string, max?: number): string;
//# sourceMappingURL=text.d.ts.map