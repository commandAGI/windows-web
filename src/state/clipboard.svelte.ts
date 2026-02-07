/** Shared clipboard for text and files across all Windows apps. */

export interface ClipboardState {
	type: 'text' | 'files';
	text?: string;
	filePaths?: string[];
	action?: 'copy' | 'cut';
	timestamp: number;
}

/** Clipboard store - mutate .value instead of reassigning. */
export const clipboard_store = $state<{ value: ClipboardState | null }>({ value: null });

/** Copy text to the shared clipboard. */
export function copyText(text: string): void {
	clipboard_store.value = {
		type: 'text',
		text,
		timestamp: Date.now(),
	};
}

/** Copy file paths to the shared clipboard. */
export function copyFiles(paths: string[], action: 'copy' | 'cut' = 'copy'): void {
	clipboard_store.value = {
		type: 'files',
		filePaths: [...paths],
		action,
		timestamp: Date.now(),
	};
}

/** Read clipboard text. Returns null if clipboard is empty or not text. */
export function pasteText(): string | null {
	if (!clipboard_store.value || clipboard_store.value.type !== 'text') return null;
	return clipboard_store.value.text ?? null;
}

/** Read clipboard file paths. Returns null if clipboard is empty or not files. */
export function pasteFiles(): { paths: string[]; action: 'copy' | 'cut' } | null {
	const c = clipboard_store.value;
	if (!c || c.type !== 'files' || !c.filePaths) return null;
	const result = { paths: [...c.filePaths], action: c.action ?? 'copy' as const };
	// Clear clipboard after cut
	if (c.action === 'cut') {
		clipboard_store.value = null;
	}
	return result;
}

/** Clear the clipboard. */
export function clearClipboard(): void {
	clipboard_store.value = null;
}
