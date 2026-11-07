/**
 * Attachments: pictures added to a message before it is sent. The core keeps the composer's list
 * of them (in the order they were picked, however their uploads finish), and reads which files a
 * paste or a drop holds. Uploading is the app's: it reports back when each upload came through
 * or why not. Types are structural, so a browser's File, DataTransfer and ClipboardData fit, and
 * so does anything shaped like them.
 */
/** The pictures among a paste's or a drop's contents, in order; anything else (text, a PDF) is left out. */
export function imageFilesFrom(transfer) {
    if (!transfer)
        return [];
    const isImage = (type) => /^image\//iu.test(type);
    const fromItems = [];
    for (const item of Array.from(transfer.items ?? [])) {
        if (item.kind !== 'file' || !isImage(item.type))
            continue;
        const file = item.getAsFile();
        if (file)
            fromItems.push(file);
    }
    if (fromItems.length > 0)
        return fromItems;
    return Array.from(transfer.files ?? []).filter((f) => isImage(f.type));
}
//# sourceMappingURL=attachments.js.map