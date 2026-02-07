<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { vfs_store, ls, readFile, writeFile, stat, mkdir } from '../../state/vfs.svelte';
	import type { FSNode } from '../../state/vfs.svelte';
	import { consumePendingFile } from '../../state/file-opener.svelte';
	import { notify } from '../../state/notifications.svelte';
	import { copyText, pasteText } from '../../state/clipboard.svelte';

	interface NotepadTab {
		id: number;
		title: string;
		content: string;
		modified: boolean;
		filePath?: string; // VFS path if saved
	}

	const TEXT_EXTENSIONS = ['.txt', '.md', '.log', '.ini', '.json', '.js', '.css', '.html'];

	function isTextFile(name: string): boolean {
		const lower = name.toLowerCase();
		return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
	}

	let tabs = $state<NotepadTab[]>([
		{
			id: 1,
			title: 'Untitled',
			content: `Welcome to Notepad!\n\nThis is the Windows 11 Notepad with tab support.\nYou can edit this text, create new tabs, and more.\n\nFeatures:\n- Tab-based editing\n- Line and column tracking\n- Modern Windows 11 design\n\nTry typing something here...`,
			modified: false,
		},
	]);
	let activeTabId = $state(1);
	let nextTabId = $state(2);

	let activeTab = $derived(tabs.find((t) => t.id === activeTabId));

	let cursorLine = $state(1);
	let cursorCol = $state(1);
	let wordWrap = $state(true);
	let showStatusBar = $state(true);
	let showFindBar = $state(false);
	let findQuery = $state('');
	let findMatchIndex = $state(-1);
	let findMatchCount = $state(0);
	let showFilePicker = $state(false);
	let showSaveAsDialog = $state(false);
	let saveAsFilename = $state('');
	let saveAsPath = $state('C:/Users/User/Documents');
	let savedIndicator = $state(false);
	let showSaveConfirm = $state(false);
	let pendingCloseTabId = $state<number | null>(null);

	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let findInputRef = $state<HTMLInputElement | null>(null);

	// Open dialog VFS browser state
	let openDialogPath = $state('C:/Users/User/Documents');
	let openDialogEntries = $derived.by(() => {
		// Subscribe to vfsVersion for reactivity
		void vfs_store.version;
		const entries = ls(openDialogPath);
		// Show directories first, then text files, sorted alphabetically
		const dirs = entries.filter((e) => e.type === 'dir').sort((a, b) => a.name.localeCompare(b.name));
		const files = entries.filter((e) => e.type === 'file' && isTextFile(e.name)).sort((a, b) => a.name.localeCompare(b.name));
		return [...dirs, ...files];
	});

	function addTab() {
		const newTab: NotepadTab = {
			id: nextTabId,
			title: 'Untitled',
			content: '',
			modified: false,
		};
		tabs = [...tabs, newTab];
		activeTabId = nextTabId;
		nextTabId++;
	}

	function closeTab(id: number) {
		const tab = tabs.find((t) => t.id === id);
		if (tab && tab.modified) {
			pendingCloseTabId = id;
			showSaveConfirm = true;
			return;
		}
		doCloseTab(id);
	}

	function doCloseTab(id: number) {
		if (tabs.length === 1) {
			// Close the last tab and create a new empty one
			tabs = [{
				id: nextTabId,
				title: 'Untitled',
				content: '',
				modified: false,
			}];
			activeTabId = nextTabId;
			nextTabId++;
			return;
		}
		const idx = tabs.findIndex((t) => t.id === id);
		tabs = tabs.filter((t) => t.id !== id);
		if (activeTabId === id) {
			activeTabId = tabs[Math.min(idx, tabs.length - 1)].id;
		}
	}

	function handleSaveConfirmSave() {
		doSave();
		if (pendingCloseTabId !== null) {
			doCloseTab(pendingCloseTabId);
		}
		showSaveConfirm = false;
		pendingCloseTabId = null;
	}

	function handleSaveConfirmDontSave() {
		if (pendingCloseTabId !== null) {
			doCloseTab(pendingCloseTabId);
		}
		showSaveConfirm = false;
		pendingCloseTabId = null;
	}

	function handleSaveConfirmCancel() {
		showSaveConfirm = false;
		pendingCloseTabId = null;
	}

	function handleTextInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		const tab = tabs.find((t) => t.id === activeTabId);
		if (tab) {
			tab.content = textarea.value;
			tab.modified = true;
			tabs = tabs;
		}
		updateCursorPosition(textarea);
	}

	function updateCursorPosition(textarea: HTMLTextAreaElement) {
		const text = textarea.value.substring(0, textarea.selectionStart);
		const lines = text.split('\n');
		cursorLine = lines.length;
		cursorCol = lines[lines.length - 1].length + 1;
	}

	function handleClick(e: MouseEvent) {
		const textarea = e.target as HTMLTextAreaElement;
		updateCursorPosition(textarea);
	}

	function handleKeyUp(e: KeyboardEvent) {
		const textarea = e.target as HTMLTextAreaElement;
		updateCursorPosition(textarea);
	}

	let menuOpen = $state<string | null>(null);

	// Menu actions
	function doNewTab() {
		addTab();
		menuOpen = null;
	}

	function doNewWindow() {
		menuOpen = null;
	}

	function doOpen() {
		menuOpen = null;
		openDialogPath = 'C:/Users/User/Documents';
		showFilePicker = true;
	}

	function doSave() {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab) {
			menuOpen = null;
			return;
		}
		if (tab.filePath) {
			// Write to VFS at the known path
			writeFile(tab.filePath, tab.content);
			tab.modified = false;
			tabs = tabs;
			savedIndicator = true;
			setTimeout(() => { savedIndicator = false; }, 1500);
			notify({ appName: 'Notepad', appIcon: '📝', title: 'File saved', body: `File saved to ${tab.filePath}` });
		} else {
			// No path yet — trigger Save As
			doSaveAs();
			return;
		}
		menuOpen = null;
	}

	function doSaveAs() {
		menuOpen = null;
		const tab = tabs.find((t) => t.id === activeTabId);
		saveAsFilename = tab ? tab.title : 'Untitled';
		saveAsPath = tab?.filePath
			? tab.filePath.substring(0, tab.filePath.lastIndexOf('/'))
			: 'C:/Users/User/Documents';
		showSaveAsDialog = true;
	}

	function confirmSaveAs() {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (tab && saveAsFilename.trim()) {
			const filename = saveAsFilename.trim();
			const dirPath = saveAsPath.trim() || 'C:/Users/User/Documents';
			const fullPath = dirPath + '/' + filename;

			// Ensure the directory exists
			mkdir(dirPath);

			// Write to VFS
			writeFile(fullPath, tab.content);

			tab.title = filename;
			tab.filePath = fullPath;
			tab.modified = false;
			tabs = tabs;
			savedIndicator = true;
			setTimeout(() => { savedIndicator = false; }, 1500);
			notify({ appName: 'Notepad', appIcon: '📝', title: 'File saved', body: `File saved to ${fullPath}` });
		}
		showSaveAsDialog = false;
	}

	function doCloseCurrentTab() {
		closeTab(activeTabId);
		menuOpen = null;
	}

	function doUndo() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			document.execCommand('undo');
		}
	}

	function doRedo() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			document.execCommand('redo');
		}
	}

	function doCut() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			// Copy selected text to shared clipboard before cutting
			const start = textareaRef.selectionStart;
			const end = textareaRef.selectionEnd;
			if (start !== end) {
				const selected = textareaRef.value.substring(start, end);
				copyText(selected);
			}
			document.execCommand('cut');
		}
	}

	function doCopy() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			// Copy selected text to shared clipboard
			const start = textareaRef.selectionStart;
			const end = textareaRef.selectionEnd;
			if (start !== end) {
				const selected = textareaRef.value.substring(start, end);
				copyText(selected);
			}
			document.execCommand('copy');
		}
	}

	function doPaste() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			// Paste from shared clipboard first, fall back to browser clipboard
			const sharedText = pasteText();
			if (sharedText !== null) {
				document.execCommand('insertText', false, sharedText);
			} else {
				navigator.clipboard.readText().then((text) => {
					document.execCommand('insertText', false, text);
				}).catch(() => {
					document.execCommand('paste');
				});
			}
		}
	}

	function doSelectAll() {
		menuOpen = null;
		if (textareaRef) {
			textareaRef.focus();
			textareaRef.select();
		}
	}

	function doFind() {
		menuOpen = null;
		showFindBar = true;
		requestAnimationFrame(() => {
			if (findInputRef) findInputRef.focus();
		});
	}

	function doFindNext() {
		if (!textareaRef || !findQuery) return;
		const content = textareaRef.value;
		const query = findQuery.toLowerCase();
		const lowerContent = content.toLowerCase();
		const matches: number[] = [];
		let idx = lowerContent.indexOf(query);
		while (idx !== -1) {
			matches.push(idx);
			idx = lowerContent.indexOf(query, idx + 1);
		}
		findMatchCount = matches.length;
		if (matches.length === 0) {
			findMatchIndex = -1;
			return;
		}
		findMatchIndex = (findMatchIndex + 1) % matches.length;
		const matchPos = matches[findMatchIndex];
		textareaRef.focus();
		textareaRef.setSelectionRange(matchPos, matchPos + findQuery.length);
	}

	function doFindPrev() {
		if (!textareaRef || !findQuery) return;
		const content = textareaRef.value;
		const query = findQuery.toLowerCase();
		const lowerContent = content.toLowerCase();
		const matches: number[] = [];
		let idx = lowerContent.indexOf(query);
		while (idx !== -1) {
			matches.push(idx);
			idx = lowerContent.indexOf(query, idx + 1);
		}
		findMatchCount = matches.length;
		if (matches.length === 0) {
			findMatchIndex = -1;
			return;
		}
		findMatchIndex = (findMatchIndex - 1 + matches.length) % matches.length;
		const matchPos = matches[findMatchIndex];
		textareaRef.focus();
		textareaRef.setSelectionRange(matchPos, matchPos + findQuery.length);
	}

	function closeFindBar() {
		showFindBar = false;
		findQuery = '';
		findMatchIndex = -1;
		findMatchCount = 0;
		if (textareaRef) textareaRef.focus();
	}

	function toggleWordWrap() {
		wordWrap = !wordWrap;
		menuOpen = null;
	}

	function toggleStatusBar() {
		showStatusBar = !showStatusBar;
		menuOpen = null;
	}

	// Open dialog: navigate into a directory
	function openDialogNavigate(dirName: string) {
		openDialogPath = openDialogPath + '/' + dirName;
	}

	// Open dialog: go up one level
	function openDialogGoUp() {
		const lastSlash = openDialogPath.lastIndexOf('/');
		if (lastSlash > 2) {
			// e.g. "C:/Users/User" -> "C:/Users"
			openDialogPath = openDialogPath.substring(0, lastSlash);
		} else if (lastSlash === 2) {
			// e.g. "C:/Users" -> "C:"
			openDialogPath = openDialogPath.substring(0, 2);
		}
		// If already at drive root like "C:", don't go further
	}

	// Open dialog: select and open a file
	function openDialogSelectFile(entry: FSNode) {
		const filePath = openDialogPath + '/' + entry.name;
		const content = readFile(filePath);
		if (content === null) return;

		const newTab: NotepadTab = {
			id: nextTabId++,
			title: entry.name,
			content,
			modified: false,
			filePath,
		};
		tabs = [...tabs, newTab];
		activeTabId = newTab.id;
		showFilePicker = false;
	}

	// Keyboard shortcuts
	function handleGlobalKeyDown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 'n':
					e.preventDefault();
					e.stopPropagation();
					doNewTab();
					break;
				case 's':
					e.preventDefault();
					e.stopPropagation();
					if (e.shiftKey) {
						doSaveAs();
					} else {
						doSave();
					}
					break;
				case 'f':
					e.preventDefault();
					e.stopPropagation();
					doFind();
					break;
				case 'a':
					e.preventDefault();
					e.stopPropagation();
					doSelectAll();
					break;
				case 'z':
					e.preventDefault();
					e.stopPropagation();
					doUndo();
					break;
				case 'y':
					e.preventDefault();
					e.stopPropagation();
					doRedo();
					break;
				case 'c':
					e.preventDefault();
					e.stopPropagation();
					doCopy();
					break;
				case 'v':
					e.preventDefault();
					e.stopPropagation();
					doPaste();
					break;
				case 'x':
					e.preventDefault();
					e.stopPropagation();
					doCut();
					break;
				case 'w':
					e.preventDefault();
					e.stopPropagation();
					doCloseCurrentTab();
					break;
			}
		}
		if (e.key === 'Escape') {
			if (showFindBar) closeFindBar();
			if (showFilePicker) showFilePicker = false;
			if (showSaveAsDialog) showSaveAsDialog = false;
			if (showSaveConfirm) handleSaveConfirmCancel();
		}
	}

	// Cursor position tracking via selectionchange
	function handleSelectionChange() {
		if (textareaRef && document.activeElement === textareaRef) {
			updateCursorPosition(textareaRef);
		}
	}

	onMount(() => {
		document.addEventListener('selectionchange', handleSelectionChange);

		// Check for pending file open (e.g. double-clicked from File Explorer)
		const pending = consumePendingFile();
		if (pending) {
			const name = pending.path.split('/').pop() || 'Untitled';
			const tab: NotepadTab = {
				id: nextTabId++,
				title: name,
				content: pending.content ?? '',
				modified: false,
				filePath: pending.path,
			};
			tabs = [...tabs, tab];
			activeTabId = tab.id;
		}
	});

	onDestroy(() => {
		document.removeEventListener('selectionchange', handleSelectionChange);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="notepad-app" onkeydown={handleGlobalKeyDown}>
	<!-- Menu bar -->
	<div class="menu-bar">
		{#each ['File', 'Edit', 'View'] as menu}
			<button
				class="menu-item"
				class:active={menuOpen === menu}
				onclick={() => menuOpen = menuOpen === menu ? null : menu}
				onmouseenter={() => { if (menuOpen) menuOpen = menu; }}
			>
				{menu}
			</button>
		{/each}
		{#if menuOpen}
			<div class="menu-dropdown" style:left={menuOpen === 'File' ? '0px' : menuOpen === 'Edit' ? '40px' : '80px'}>
				{#if menuOpen === 'File'}
					<button class="dropdown-item" onclick={doNewTab}>New Tab <span class="shortcut">Ctrl+N</span></button>
					<button class="dropdown-item" onclick={doNewWindow}>New Window <span class="shortcut">Ctrl+Shift+N</span></button>
					<button class="dropdown-item" onclick={doOpen}>Open... <span class="shortcut">Ctrl+O</span></button>
					<button class="dropdown-item" onclick={doSave}>Save <span class="shortcut">Ctrl+S</span></button>
					<button class="dropdown-item" onclick={doSaveAs}>Save As... <span class="shortcut">Ctrl+Shift+S</span></button>
					<div class="dropdown-separator"></div>
					<button class="dropdown-item" onclick={doCloseCurrentTab}>Close Tab <span class="shortcut">Ctrl+W</span></button>
				{:else if menuOpen === 'Edit'}
					<button class="dropdown-item" onclick={doUndo}>Undo <span class="shortcut">Ctrl+Z</span></button>
					<button class="dropdown-item" onclick={doRedo}>Redo <span class="shortcut">Ctrl+Y</span></button>
					<div class="dropdown-separator"></div>
					<button class="dropdown-item" onclick={doCut}>Cut <span class="shortcut">Ctrl+X</span></button>
					<button class="dropdown-item" onclick={doCopy}>Copy <span class="shortcut">Ctrl+C</span></button>
					<button class="dropdown-item" onclick={doPaste}>Paste <span class="shortcut">Ctrl+V</span></button>
					<button class="dropdown-item" onclick={doSelectAll}>Select All <span class="shortcut">Ctrl+A</span></button>
					<div class="dropdown-separator"></div>
					<button class="dropdown-item" onclick={doFind}>Find... <span class="shortcut">Ctrl+F</span></button>
					<button class="dropdown-item" onclick={() => { doFind(); }}>Replace... <span class="shortcut">Ctrl+H</span></button>
				{:else}
					<button class="dropdown-item" onclick={toggleWordWrap}>
						{#if wordWrap}
							<span class="checkmark">&#10003;</span>
						{/if}
						Word Wrap
					</button>
					<button class="dropdown-item" onclick={toggleStatusBar}>
						{#if showStatusBar}
							<span class="checkmark">&#10003;</span>
						{/if}
						Status Bar
					</button>
				{/if}
			</div>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="menu-backdrop" onclick={() => menuOpen = null}></div>
		{/if}
	</div>

	<!-- Find bar -->
	{#if showFindBar}
		<div class="find-bar">
			<input
				type="text"
				class="find-input"
				placeholder="Find..."
				bind:value={findQuery}
				bind:this={findInputRef}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						if (e.shiftKey) doFindPrev(); else doFindNext();
					}
					if (e.key === 'Escape') closeFindBar();
				}}
			/>
			<span class="find-count">
				{#if findQuery && findMatchCount > 0}
					{findMatchIndex + 1} of {findMatchCount}
				{:else if findQuery}
					No results
				{/if}
			</span>
			<button class="find-btn" onclick={doFindPrev} title="Previous match">
				<svg width="12" height="12" viewBox="0 0 12 12">
					<polyline points="9,8 6,4 3,8" fill="none" stroke="currentColor" stroke-width="1.5" />
				</svg>
			</button>
			<button class="find-btn" onclick={doFindNext} title="Next match">
				<svg width="12" height="12" viewBox="0 0 12 12">
					<polyline points="3,4 6,8 9,4" fill="none" stroke="currentColor" stroke-width="1.5" />
				</svg>
			</button>
			<button class="find-btn" onclick={closeFindBar} title="Close">
				<svg width="10" height="10" viewBox="0 0 10 10">
					<line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.2" />
					<line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.2" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- Tab bar -->
	<div class="tab-bar">
		{#each tabs as tab (tab.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="tab"
				class:active={activeTabId === tab.id}
				onclick={() => activeTabId = tab.id}
			>
				<span class="tab-title">{tab.title}{tab.modified ? ' *' : ''}</span>
				<button class="tab-close" onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>
					<svg width="8" height="8" viewBox="0 0 8 8">
						<line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" stroke-width="1" />
						<line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" stroke-width="1" />
					</svg>
				</button>
			</div>
		{/each}
		<button class="new-tab-btn" onclick={addTab}>
			<svg width="10" height="10" viewBox="0 0 10 10">
				<line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" stroke-width="1" />
				<line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1" />
			</svg>
		</button>
	</div>

	<!-- Editor area -->
	<div class="editor-area">
		{#if activeTab}
			<textarea
				class="editor"
				class:no-wrap={!wordWrap}
				value={activeTab.content}
				oninput={handleTextInput}
				onclick={handleClick}
				onkeyup={handleKeyUp}
				spellcheck="false"
				bind:this={textareaRef}
			></textarea>
		{/if}
	</div>

	<!-- Saved indicator -->
	{#if savedIndicator}
		<div class="saved-indicator">Saved</div>
	{/if}

	<!-- Status bar -->
	{#if showStatusBar}
		<div class="status-bar">
			<span>Ln {cursorLine}, Col {cursorCol}</span>
			<span>UTF-8</span>
			<span>Windows (CRLF)</span>
		</div>
	{/if}

	<!-- File picker overlay (VFS browser) -->
	{#if showFilePicker}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="overlay-backdrop" onclick={() => showFilePicker = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="dialog open-dialog" onclick={(e) => e.stopPropagation()}>
				<div class="dialog-title">Open File</div>
				<div class="open-dialog-path">
					<button class="open-dialog-up-btn" onclick={openDialogGoUp} title="Go up">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<polyline points="3,8 7,4 11,8" stroke="currentColor" stroke-width="1.5" fill="none" />
							<line x1="7" y1="4" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" />
						</svg>
					</button>
					<span class="open-dialog-path-text">{openDialogPath}</span>
				</div>
				<div class="file-list">
					{#each openDialogEntries as entry}
						{#if entry.type === 'dir'}
							<button class="file-item" ondblclick={() => openDialogNavigate(entry.name)} onclick={() => openDialogNavigate(entry.name)}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
									<path d="M1.5 3.5 C1.5 2.5 2 2 3 2 L6 2 L7.5 3.5 L13 3.5 C14 3.5 14.5 4 14.5 5 L14.5 12 C14.5 13 14 13.5 13 13.5 L3 13.5 C2 13.5 1.5 13 1.5 12 Z" fill="#FFB900" stroke="#E5A500" stroke-width="0.5" />
								</svg>
								<span>{entry.name}</span>
							</button>
						{:else}
							<button class="file-item" onclick={() => openDialogSelectFile(entry)}>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
									<rect x="2" y="1" width="12" height="14" rx="1" stroke="#666" stroke-width="1" fill="#f8f8f8" />
									<line x1="5" y1="5" x2="11" y2="5" stroke="#999" stroke-width="0.8" />
									<line x1="5" y1="7.5" x2="11" y2="7.5" stroke="#999" stroke-width="0.8" />
									<line x1="5" y1="10" x2="9" y2="10" stroke="#999" stroke-width="0.8" />
								</svg>
								<span>{entry.name}</span>
							</button>
						{/if}
					{/each}
					{#if openDialogEntries.length === 0}
						<div class="open-dialog-empty">No text files in this directory</div>
					{/if}
				</div>
				<div class="dialog-actions">
					<button class="dialog-btn" onclick={() => showFilePicker = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Save As dialog -->
	{#if showSaveAsDialog}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="overlay-backdrop" onclick={() => showSaveAsDialog = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="dialog" onclick={(e) => e.stopPropagation()}>
				<div class="dialog-title">Save As</div>
				<div class="save-as-input-row">
					<label class="save-as-label" for="save-as-path">Location:</label>
					<input
						id="save-as-path"
						type="text"
						class="save-as-input"
						bind:value={saveAsPath}
					/>
				</div>
				<div class="save-as-input-row">
					<label class="save-as-label" for="save-as-name">File name:</label>
					<input
						id="save-as-name"
						type="text"
						class="save-as-input"
						bind:value={saveAsFilename}
						onkeydown={(e) => { if (e.key === 'Enter') confirmSaveAs(); }}
					/>
				</div>
				<div class="dialog-actions">
					<button class="dialog-btn primary" onclick={confirmSaveAs}>Save</button>
					<button class="dialog-btn" onclick={() => showSaveAsDialog = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Save confirmation dialog -->
	{#if showSaveConfirm}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="overlay-backdrop" onclick={handleSaveConfirmCancel}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="dialog" onclick={(e) => e.stopPropagation()}>
				<div class="dialog-title">Notepad</div>
				<div class="dialog-message">Do you want to save changes to {tabs.find(t => t.id === pendingCloseTabId)?.title || 'Untitled'}?</div>
				<div class="dialog-actions">
					<button class="dialog-btn primary" onclick={handleSaveConfirmSave}>Save</button>
					<button class="dialog-btn" onclick={handleSaveConfirmDontSave}>Don't Save</button>
					<button class="dialog-btn" onclick={handleSaveConfirmCancel}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.notepad-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: white;
		position: relative;
	}

	/* Menu bar */
	.menu-bar {
		display: flex;
		align-items: center;
		padding: 0 4px;
		background: var(--win-surface);
		position: relative;
		z-index: 10;
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
	}

	.menu-item {
		padding: 4px 10px;
		font-size: 13px;
		color: var(--win-text-primary);
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
	}

	.menu-item:hover,
	.menu-item.active {
		background: rgba(0, 0, 0, 0.04);
	}

	.menu-dropdown {
		position: absolute;
		top: 100%;
		min-width: 220px;
		background: rgba(252, 252, 252, 0.96);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-md);
		box-shadow: var(--win-shadow-flyout);
		padding: 4px;
		z-index: 100;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 6px 12px;
		font-size: 13px;
		color: var(--win-text-primary);
		text-align: left;
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
		gap: 8px;
	}

	.dropdown-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.shortcut {
		font-size: 12px;
		color: var(--win-text-secondary);
		margin-left: auto;
	}

	.checkmark {
		font-size: 12px;
		color: var(--win-text-primary);
		margin-right: 4px;
		flex-shrink: 0;
	}

	.dropdown-separator {
		height: 1px;
		background: rgba(0, 0, 0, 0.06);
		margin: 4px 12px;
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
	}

	/* Find bar */
	.find-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--win-surface);
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		z-index: 5;
	}

	.find-input {
		flex: 1;
		max-width: 260px;
		padding: 4px 8px;
		font-size: 13px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		outline: none;
	}

	.find-input:focus {
		border-color: var(--win-accent);
	}

	.find-count {
		font-size: 12px;
		color: var(--win-text-secondary);
		min-width: 70px;
	}

	.find-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		transition: background-color 0.08s ease;
	}

	.find-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	/* Tab bar */
	.tab-bar {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 4px 8px 0;
		background: var(--win-surface);
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		font-size: 12px;
		color: var(--win-text-secondary);
		border-radius: 6px 6px 0 0;
		cursor: default;
		transition: background-color 0.08s ease;
	}

	.tab:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.tab.active {
		background: white;
		color: var(--win-text-primary);
	}

	.tab-title {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tab-close {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		color: var(--win-text-secondary);
		opacity: 0;
		transition: all 0.08s ease;
	}

	.tab:hover .tab-close {
		opacity: 1;
	}

	.tab-close:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.new-tab-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		transition: background-color 0.08s ease;
	}

	.new-tab-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	/* Editor */
	.editor-area {
		flex: 1;
		overflow: hidden;
	}

	.editor {
		width: 100%;
		height: 100%;
		padding: 12px 16px;
		border: none;
		resize: none;
		font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
		font-size: 14px;
		line-height: 1.5;
		color: var(--win-text-primary);
		background: white;
		tab-size: 4;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.editor.no-wrap {
		white-space: pre;
		word-wrap: normal;
		overflow-wrap: normal;
		overflow-x: auto;
	}

	/* Status bar */
	.status-bar {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 4px 16px;
		font-size: 12px;
		color: var(--win-text-secondary);
		background: var(--win-surface);
		border-top: 1px solid rgba(0, 0, 0, 0.04);
		min-height: 24px;
	}

	/* Saved indicator */
	.saved-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(0, 0, 0, 0.75);
		color: white;
		padding: 8px 20px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		pointer-events: none;
		z-index: 200;
		animation: fadeInOut 1.5s ease forwards;
	}

	@keyframes fadeInOut {
		0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
		15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		70% { opacity: 1; }
		100% { opacity: 0; }
	}

	/* Overlay / Dialogs */
	.overlay-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
	}

	.dialog {
		background: white;
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		min-width: 320px;
		max-width: 420px;
		padding: 20px;
	}

	.dialog.open-dialog {
		min-width: 380px;
		max-width: 480px;
	}

	.dialog-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
		margin-bottom: 16px;
	}

	.dialog-message {
		font-size: 13px;
		color: var(--win-text-secondary);
		margin-bottom: 20px;
		line-height: 1.4;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 16px;
	}

	.dialog-btn {
		padding: 6px 16px;
		font-size: 13px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		cursor: pointer;
		transition: background-color 0.08s ease;
	}

	.dialog-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.dialog-btn.primary {
		background: var(--win-accent, #005fb8);
		color: white;
		border: 1px solid var(--win-accent, #005fb8);
	}

	.dialog-btn.primary:hover {
		opacity: 0.9;
	}

	/* Open dialog path bar */
	.open-dialog-path {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		margin-bottom: 8px;
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-sm);
	}

	.open-dialog-up-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		flex-shrink: 0;
		transition: background-color 0.08s ease;
	}

	.open-dialog-up-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.open-dialog-path-text {
		font-size: 12px;
		color: var(--win-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.open-dialog-empty {
		padding: 16px;
		text-align: center;
		font-size: 13px;
		color: var(--win-text-secondary);
	}

	/* File list */
	.file-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 240px;
		overflow-y: auto;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		font-size: 13px;
		color: var(--win-text-primary);
		text-align: left;
		border-radius: var(--win-radius-sm);
		cursor: pointer;
		transition: background-color 0.08s ease;
		width: 100%;
	}

	.file-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	/* Save As */
	.save-as-input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.save-as-label {
		font-size: 13px;
		color: var(--win-text-secondary);
		white-space: nowrap;
	}

	.save-as-input {
		flex: 1;
		padding: 5px 8px;
		font-size: 13px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: var(--win-radius-sm);
		outline: none;
		color: var(--win-text-primary);
	}

	.save-as-input:focus {
		border-color: var(--win-accent);
	}
</style>
