<script lang="ts">
	import { onMount } from 'svelte';

	type CaptureMode = 'rectangle' | 'freeform' | 'window' | 'fullscreen';
	type TimerDelay = 0 | 3 | 5 | 10;

	let captureMode = $state<CaptureMode>('rectangle');
	let timerDelay = $state<TimerDelay>(0);
	let captures = $state<CaptureItem[]>([]);
	let selectedCapture = $state<CaptureItem | null>(null);
	let isCapturing = $state(false);
	let countdown = $state(0);
	let countdownInterval: ReturnType<typeof setInterval> | undefined;

	interface CaptureItem {
		id: number;
		mode: CaptureMode;
		timestamp: string;
		color: string; // placeholder
		width: number;
		height: number;
	}

	const modes: { id: CaptureMode; label: string; description: string }[] = [
		{ id: 'rectangle', label: 'Rectangle', description: 'Capture a rectangular area' },
		{ id: 'freeform', label: 'Freeform', description: 'Capture a custom shape' },
		{ id: 'window', label: 'Window', description: 'Capture a window' },
		{ id: 'fullscreen', label: 'Full screen', description: 'Capture the entire screen' },
	];

	const timers: { value: TimerDelay; label: string }[] = [
		{ value: 0, label: 'No delay' },
		{ value: 3, label: '3 seconds' },
		{ value: 5, label: '5 seconds' },
		{ value: 10, label: '10 seconds' },
	];

	function startCapture() {
		if (timerDelay > 0) {
			countdown = timerDelay;
			isCapturing = true;
			countdownInterval = setInterval(() => {
				countdown--;
				if (countdown <= 0) {
					clearInterval(countdownInterval);
					performCapture();
				}
			}, 1000);
		} else {
			performCapture();
		}
	}

	function performCapture() {
		const colors = ['#6c5ce7', '#0984e3', '#e17055', '#00b894', '#fdcb6e', '#74b9ff'];
		const capture: CaptureItem = {
			id: Date.now(),
			mode: captureMode,
			timestamp: new Date().toLocaleTimeString(),
			color: colors[captures.length % colors.length],
			width: 800 + Math.floor(Math.random() * 400),
			height: 450 + Math.floor(Math.random() * 200),
		};
		captures = [capture, ...captures];
		selectedCapture = capture;
		isCapturing = false;
	}

	function deleteCapture(id: number) {
		captures = captures.filter(c => c.id !== id);
		if (selectedCapture?.id === id) {
			selectedCapture = captures[0] || null;
		}
	}

	function getModeIcon(mode: CaptureMode): string {
		switch (mode) {
			case 'rectangle': return 'rect';
			case 'freeform': return 'free';
			case 'window': return 'win';
			case 'fullscreen': return 'full';
		}
	}
</script>

<div class="snipping-app">
	<div class="snipping-toolbar">
		<div class="toolbar-section">
			<div class="mode-selector">
				{#each modes as mode (mode.id)}
					<button
						class="mode-btn"
						class:active={captureMode === mode.id}
						onclick={() => captureMode = mode.id}
						title={mode.description}
					>
						{#if mode.id === 'rectangle'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2" /></svg>
						{:else if mode.id === 'freeform'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16 C8 8, 12 20, 16 10 C18 6, 20 14, 20 12" stroke-dasharray="4 2" /></svg>
						{:else if mode.id === 'window'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="8" x2="22" y2="8" /></svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2" /><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
						{/if}
					</button>
				{/each}
			</div>

			<div class="toolbar-separator"></div>

			<div class="timer-selector">
				<span class="timer-label">Delay:</span>
				{#each timers as timer (timer.value)}
					<button
						class="timer-btn"
						class:active={timerDelay === timer.value}
						onclick={() => timerDelay = timer.value}
					>
						{timer.value === 0 ? 'None' : `${timer.value}s`}
					</button>
				{/each}
			</div>
		</div>

		<button class="capture-btn" onclick={startCapture} disabled={isCapturing}>
			{#if isCapturing}
				Capturing in {countdown}...
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
				New
			{/if}
		</button>
	</div>

	<div class="snipping-main">
		<div class="preview-area">
			{#if isCapturing && countdown > 0}
				<div class="countdown-overlay">
					<span class="countdown-number">{countdown}</span>
					<span class="countdown-label">seconds</span>
				</div>
			{:else if selectedCapture}
				<div class="capture-preview" style:background={selectedCapture.color}>
					<div class="preview-content">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
						<div class="preview-info">
							<span class="preview-mode">{modes.find(m => m.id === selectedCapture?.mode)?.label} Capture</span>
							<span class="preview-dims">{selectedCapture.width} x {selectedCapture.height}</span>
						</div>
					</div>
				</div>

				<div class="capture-actions">
					<button class="action-btn" title="Copy to clipboard">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
						Copy
					</button>
					<button class="action-btn" title="Save">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
						Save
					</button>
					<button class="action-btn" title="Share">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
						Share
					</button>
				</div>
			{:else}
				<div class="empty-preview">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(0,0,0,0.12)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
					<p>Click "New" to capture a screenshot</p>
					<p class="hint">Or press Win + Shift + S</p>
				</div>
			{/if}
		</div>

		{#if captures.length > 0}
			<div class="captures-panel">
				<h4 class="panel-title">Recent captures</h4>
				<div class="captures-list">
					{#each captures as capture (capture.id)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="capture-item"
							class:selected={selectedCapture?.id === capture.id}
							onclick={() => selectedCapture = capture}
						>
							<div class="capture-thumb" style:background={capture.color}></div>
							<div class="capture-info">
								<span class="capture-mode-label">{modes.find(m => m.id === capture.mode)?.label}</span>
								<span class="capture-time">{capture.timestamp}</span>
							</div>
							<button class="delete-btn" onclick={(e) => { e.stopPropagation(); deleteCapture(capture.id); }} title="Delete">
								<svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.2" /><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.2" /></svg>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.snipping-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--win-surface);
	}

	.snipping-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.mode-selector {
		display: flex;
		gap: 2px;
	}

	.mode-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		transition: all 0.08s ease;
	}

	.mode-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.mode-btn.active {
		background: var(--win-accent);
		color: white;
	}

	.toolbar-separator {
		width: 1px;
		height: 24px;
		background: rgba(0, 0, 0, 0.08);
	}

	.timer-selector {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.timer-label {
		font-size: 12px;
		color: var(--win-text-secondary);
		margin-right: 4px;
	}

	.timer-btn {
		padding: 4px 10px;
		font-size: 12px;
		color: var(--win-text-secondary);
		border-radius: var(--win-radius-sm);
		transition: all 0.08s ease;
	}

	.timer-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.timer-btn.active {
		background: rgba(0, 120, 212, 0.1);
		color: var(--win-accent);
	}

	.capture-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 20px;
		font-size: 13px;
		font-weight: 500;
		background: var(--win-accent);
		color: white;
		border-radius: var(--win-radius-sm);
		transition: opacity 0.08s ease;
	}

	.capture-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.capture-btn:disabled {
		opacity: 0.6;
	}

	.snipping-main {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.preview-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.countdown-overlay {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.countdown-number {
		font-size: 72px;
		font-weight: 200;
		color: var(--win-accent);
	}

	.countdown-label {
		font-size: 14px;
		color: var(--win-text-secondary);
	}

	.capture-preview {
		width: 100%;
		max-width: 500px;
		aspect-ratio: 16/9;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.preview-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.preview-info {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.preview-mode {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
	}

	.preview-dims {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.5);
	}

	.capture-actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		font-size: 12px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
	}

	.action-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.empty-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: var(--win-text-secondary);
		font-size: 14px;
	}

	.empty-preview p {
		margin: 0;
	}

	.hint {
		font-size: 12px;
		opacity: 0.7;
	}

	/* Captures panel */
	.captures-panel {
		width: 200px;
		border-left: 1px solid rgba(0, 0, 0, 0.06);
		padding: 12px;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.panel-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--win-text-secondary);
		margin-bottom: 8px;
		text-transform: uppercase;
	}

	.captures-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.capture-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: var(--win-radius-sm);
		cursor: pointer;
		transition: background-color 0.08s ease;
	}

	.capture-item:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.capture-item.selected {
		background: rgba(0, 120, 212, 0.08);
	}

	.capture-thumb {
		width: 36px;
		height: 24px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.capture-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.capture-mode-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--win-text-primary);
	}

	.capture-time {
		font-size: 10px;
		color: var(--win-text-secondary);
	}

	.delete-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		opacity: 0;
		transition: all 0.08s ease;
	}

	.capture-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #e74856;
	}
</style>
