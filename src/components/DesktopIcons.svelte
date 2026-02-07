<script lang="ts">
	import { wm, type AppID } from '../state/windows.svelte.ts';
	import { openFile } from '../state/file-opener.svelte';

	let animatingIndex = $state<number | null>(null);
	let dragIndex = $state<number | null>(null);
	let dropTarget = $state<number | null>(null);

	let selectedIndex = $derived(wm.selectedDesktopIcon);
	let iconSizeClass = $derived(wm.desktopIconSize);
	let icons = $derived(wm.desktopIcons);

	function handleClick(index: number, e: MouseEvent) {
		e.stopPropagation();
		wm.selectedDesktopIcon = index;
	}

	function handleDoubleClick(index: number) {
		const icon = icons[index];
		// Trigger scale animation
		animatingIndex = index;
		setTimeout(() => { animatingIndex = null; }, 200);

		console.log('[DesktopIcons] dblclick on:', icon.name, 'appId:', icon.appId, 'path:', icon.path);
		if (icon.path) {
			// File/directory icon — use file-opener to resolve the right app
			openFile(icon.path);
		} else if (icon.appId) {
			wm.openApp(icon.appId);
		} else if (icon.name === 'Recycle Bin') {
			wm.openApp('file-explorer');
		}
		console.log('[DesktopIcons] after open, wm.openApps:', JSON.stringify(wm.openApps));
	}

	function handleDragStart(index: number, e: DragEvent) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(index: number, e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropTarget = index;
	}

	function handleDragLeave() {
		dropTarget = null;
	}

	function handleDrop(toIndex: number, e: DragEvent) {
		e.preventDefault();
		if (dragIndex !== null && dragIndex !== toIndex) {
			wm.moveDesktopIcon(dragIndex, toIndex);
			wm.selectedDesktopIcon = toIndex;
		}
		dragIndex = null;
		dropTarget = null;
	}

	function handleDragEnd() {
		dragIndex = null;
		dropTarget = null;
	}
</script>

<div class="desktop-icons">
	{#each icons as icon, i (icon.name + '-' + i)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="desktop-icon {iconSizeClass}"
			class:selected={selectedIndex === i}
			class:bounce={animatingIndex === i}
			class:drag-over={dropTarget === i}
			class:dragging={dragIndex === i}
			data-index={i}
			draggable="true"
			onclick={(e) => handleClick(i, e)}
			ondblclick={() => handleDoubleClick(i)}
			ondragstart={(e) => handleDragStart(i, e)}
			ondragover={(e) => handleDragOver(i, e)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(i, e)}
			ondragend={handleDragEnd}
		>
			<span class="icon-emoji">{icon.icon}</span>
			<span class="icon-label">{icon.name}</span>
		</div>
	{/each}
</div>

<style>
	.desktop-icons {
		position: absolute;
		top: 12px;
		left: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 1;
	}

	.desktop-icon {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		width: 76px;
		padding: 8px 4px;
		border-radius: var(--win-radius-sm);
		cursor: default;
		transition: background-color 0.08s ease, transform 0.15s ease, opacity 0.15s ease;
	}

	.desktop-icon.large {
		width: 96px;
	}

	.desktop-icon.large .icon-emoji {
		font-size: 48px;
	}

	.desktop-icon.medium {
		width: 76px;
	}

	.desktop-icon.medium .icon-emoji {
		font-size: 36px;
	}

	.desktop-icon.small {
		width: 60px;
		padding: 4px 2px;
		gap: 2px;
	}

	.desktop-icon.small .icon-emoji {
		font-size: 24px;
	}

	.desktop-icon.small .icon-label {
		font-size: 10px;
	}

	.desktop-icon:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.desktop-icon.selected {
		background: rgba(255, 255, 255, 0.18);
		outline: 1px solid rgba(255, 255, 255, 0.25);
	}

	.desktop-icon.bounce {
		animation: iconBounce 0.2s ease;
	}

	.desktop-icon.dragging {
		opacity: 0.4;
	}

	.desktop-icon.drag-over {
		background: rgba(255, 255, 255, 0.25);
		outline: 1px dashed rgba(255, 255, 255, 0.5);
	}

	@keyframes iconBounce {
		0% { transform: scale(1); }
		40% { transform: scale(0.88); }
		100% { transform: scale(1); }
	}

	.icon-emoji {
		font-size: 36px;
		line-height: 1;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
	}

	.icon-label {
		font-size: 11px;
		color: white;
		text-align: center;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7), 0 0 2px rgba(0, 0, 0, 0.5);
		line-height: 1.3;
		word-wrap: break-word;
		max-width: 72px;
	}
</style>
