<script lang="ts">
	let content = $state('<h1>Welcome to WordPad</h1><p>This is a <strong>rich text editor</strong> with formatting support. You can make text <em>italic</em>, <strong>bold</strong>, or <u>underlined</u>.</p><p>Try using the toolbar above to format your text, change fonts, and adjust alignment.</p><p style="color: #0078d4;">You can even add colored text!</p><ul><li>Bullet point one</li><li>Bullet point two</li><li>Bullet point three</li></ul>');
	let fontFamily = $state('Segoe UI');
	let fontSize = $state('14');
	let textColor = $state('#000000');
	let editorRef = $state<HTMLDivElement | null>(null);
	let showColorPicker = $state(false);

	const fonts = ['Segoe UI', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'Comic Sans MS'];
	const sizes = ['8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

	function execCommand(cmd: string, value?: string) {
		document.execCommand(cmd, false, value);
		editorRef?.focus();
	}

	function setBold() { execCommand('bold'); }
	function setItalic() { execCommand('italic'); }
	function setUnderline() { execCommand('underline'); }
	function setStrikethrough() { execCommand('strikethrough'); }

	function setAlignLeft() { execCommand('justifyLeft'); }
	function setAlignCenter() { execCommand('justifyCenter'); }
	function setAlignRight() { execCommand('justifyRight'); }

	function insertBulletList() { execCommand('insertUnorderedList'); }
	function insertNumberList() { execCommand('insertOrderedList'); }

	function indent() { execCommand('indent'); }
	function outdent() { execCommand('outdent'); }

	function changeFont() {
		execCommand('fontName', fontFamily);
	}

	function changeFontSize() {
		// execCommand fontSize uses 1-7 scale; map to approximate
		const sizeMap: Record<string, string> = { '8': '1', '10': '1', '12': '2', '14': '3', '16': '4', '18': '5', '20': '5', '24': '6', '28': '6', '32': '7', '36': '7', '48': '7', '72': '7' };
		execCommand('fontSize', sizeMap[fontSize] || '3');
	}

	function changeColor() {
		execCommand('foreColor', textColor);
		showColorPicker = false;
	}

	function clearFormatting() { execCommand('removeFormat'); }

	let wordCount = $derived.by(() => {
		if (!editorRef) return 0;
		const text = editorRef.innerText || '';
		return text.trim() ? text.trim().split(/\s+/).length : 0;
	});

	let charCount = $derived.by(() => {
		if (!editorRef) return 0;
		return (editorRef.innerText || '').length;
	});
</script>

<div class="wordpad-app">
	<div class="toolbar-ribbon">
		<div class="ribbon-row">
			<div class="toolbar-group">
				<select class="font-select" bind:value={fontFamily} onchange={changeFont}>
					{#each fonts as f (f)}
						<option value={f} style:font-family={f}>{f}</option>
					{/each}
				</select>
				<select class="size-select" bind:value={fontSize} onchange={changeFontSize}>
					{#each sizes as s (s)}
						<option value={s}>{s}</option>
					{/each}
				</select>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-group format-group">
				<button class="fmt-btn" onclick={setBold} title="Bold (Ctrl+B)">
					<strong>B</strong>
				</button>
				<button class="fmt-btn" onclick={setItalic} title="Italic (Ctrl+I)">
					<em>I</em>
				</button>
				<button class="fmt-btn" onclick={setUnderline} title="Underline (Ctrl+U)">
					<u>U</u>
				</button>
				<button class="fmt-btn" onclick={setStrikethrough} title="Strikethrough">
					<s>S</s>
				</button>
				<div class="color-btn-wrapper">
					<button class="fmt-btn color-trigger" onclick={() => showColorPicker = !showColorPicker} title="Text color">
						<span class="color-letter">A</span>
						<div class="color-indicator" style:background={textColor}></div>
					</button>
					{#if showColorPicker}
						<div class="color-dropdown">
							<input type="color" bind:value={textColor} onchange={changeColor} class="color-picker-input" />
							<div class="preset-colors">
								{#each ['#000000', '#e74856', '#0078d4', '#00b894', '#ff8c00', '#6c5ce7', '#fdcb6e', '#ffffff'] as c (c)}
									<button class="preset-color" style:background={c} onclick={() => { textColor = c; changeColor(); }}></button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-group align-group">
				<button class="fmt-btn" onclick={setAlignLeft} title="Align left">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
				</button>
				<button class="fmt-btn" onclick={setAlignCenter} title="Align center">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
				</button>
				<button class="fmt-btn" onclick={setAlignRight} title="Align right">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
				</button>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-group list-group">
				<button class="fmt-btn" onclick={insertBulletList} title="Bullet list">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
				</button>
				<button class="fmt-btn" onclick={insertNumberList} title="Numbered list">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
				</button>
				<button class="fmt-btn" onclick={outdent} title="Decrease indent">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 4h10V5H11v2zm0 4h10v-2H11v2z"/></svg>
				</button>
				<button class="fmt-btn" onclick={indent} title="Increase indent">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 4h10V5H11v2zm0 4h10v-2H11v2z"/></svg>
				</button>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-group">
				<button class="fmt-btn" onclick={clearFormatting} title="Clear formatting">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/></svg>
				</button>
			</div>
		</div>
	</div>

	<div class="editor-container">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="rich-editor"
			contenteditable="true"
			bind:this={editorRef}
			bind:innerHTML={content}
			onclick={() => showColorPicker = false}
		></div>
	</div>

	<div class="status-bar">
		<span>Words: {wordCount}</span>
		<span>Characters: {charCount}</span>
		<span class="zoom-control">100%</span>
	</div>
</div>

<style>
	.wordpad-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--win-surface);
	}

	.toolbar-ribbon {
		padding: 6px 12px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}

	.ribbon-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.toolbar-separator {
		width: 1px;
		height: 24px;
		background: rgba(0, 0, 0, 0.08);
	}

	.font-select {
		padding: 4px 8px;
		font-size: 12px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		outline: none;
		min-width: 120px;
	}

	.size-select {
		padding: 4px 6px;
		font-size: 12px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		outline: none;
		width: 50px;
	}

	.fmt-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
		font-size: 13px;
	}

	.fmt-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.fmt-btn:active {
		background: rgba(0, 0, 0, 0.1);
	}

	.color-btn-wrapper {
		position: relative;
	}

	.color-trigger {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
	}

	.color-letter {
		font-size: 14px;
		font-weight: 700;
		line-height: 1;
	}

	.color-indicator {
		width: 16px;
		height: 3px;
		border-radius: 1px;
	}

	.color-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		box-shadow: var(--win-shadow-flyout);
		padding: 8px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.color-picker-input {
		width: 100%;
		height: 30px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 3px;
		cursor: pointer;
	}

	.preset-colors {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 3px;
	}

	.preset-color {
		width: 20px;
		height: 20px;
		border-radius: 3px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		cursor: pointer;
		transition: transform 0.08s ease;
	}

	.preset-color:hover {
		transform: scale(1.15);
	}

	.editor-container {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
		background: #f5f5f5;
	}

	.rich-editor {
		max-width: 800px;
		min-height: 100%;
		margin: 0 auto;
		padding: 40px 60px;
		background: white;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 14px;
		color: var(--win-text-primary);
		line-height: 1.6;
		outline: none;
	}

	.rich-editor :global(h1) {
		font-size: 24px;
		font-weight: 600;
		margin-bottom: 12px;
	}

	.rich-editor :global(h2) {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 10px;
	}

	.rich-editor :global(p) {
		margin-bottom: 10px;
	}

	.rich-editor :global(ul), .rich-editor :global(ol) {
		padding-left: 24px;
		margin-bottom: 10px;
	}

	.rich-editor :global(li) {
		margin-bottom: 4px;
	}

	.status-bar {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 4px 16px;
		font-size: 12px;
		color: var(--win-text-secondary);
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}

	.zoom-control {
		margin-left: auto;
	}
</style>
