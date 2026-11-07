/**
 * A tiny external store: one immutable snapshot, replaced whole on every change, and listeners.
 * `getState` and `subscribe` are arrow properties, so they can be handed straight to React's
 * `useSyncExternalStore(store.subscribe, store.getState)` or to any other framework's equivalent;
 * nothing here knows which one is listening.
 */
export interface Store<S> {
    readonly getState: () => S;
    readonly subscribe: (listener: () => void) => () => void;
}
export interface WritableStore<S> extends Store<S> {
    /** Replace the snapshot (or derive the next one from it). Listeners run only if it changed. */
    readonly set: (next: S | ((current: S) => S)) => void;
}
export declare function createStore<S>(initial: S): WritableStore<S>;
//# sourceMappingURL=store.d.ts.map