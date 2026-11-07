export function createStore(initial) {
    let state = initial;
    const listeners = new Set();
    return {
        getState: () => state,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        set: (next) => {
            const value = typeof next === 'function' ? next(state) : next;
            if (Object.is(value, state))
                return;
            state = value;
            for (const listener of [...listeners]) {
                try {
                    listener();
                }
                catch (err) {
                    // One listener that throws must not keep the others from hearing about the change;
                    // the error still surfaces, just not in the middle of everyone else's update.
                    queueMicrotask(() => {
                        throw err;
                    });
                }
            }
        },
    };
}
//# sourceMappingURL=store.js.map