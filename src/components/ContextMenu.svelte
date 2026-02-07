<script lang="ts">
	import type { ContextMenuItem } from '../state/windows.svelte.ts';
	import { onMount } from 'svelte';

	let { x, y, items, onclose }: {
		x: number;
		y: number;
		items: ContextMenuItem[];
		onclose: () => void;
	} = $props();

	let menuEl: HTMLElement | undefined = $state();
	let adjustedX = $state(x);
	let adjustedY = $state(y);
	let activeSubmenu = $state<number | null>(null);

	onMount(() => {
		if (menuEl) {
			const rect = menuEl.getBoundingClientRect();
			if (rect.right > window.innerWidth) {
				adjustedX = window.innerWidth - rect.width - 8;
			}
			if (rect.bottom > window.innerHeight - 48) {
				adjustedY = window.innerHeight - 48 - rect.height - 8;
			}
		}

		function handleOutsideClick(e: MouseEvent) {
			if (menuEl && !menuEl.contains(e.target as Node)) {
				onclose();
			}
		}

		// Delay to avoid immediate trigger
		setTimeout(() => {
			document.addEventListener('click', handleOutsideClick);
		}, 10);

		return () => {
			document.removeEventListener('click', handleOutsideClick);
		};
	});

	function handleItemClick(item: ContextMenuItem) {
		if (item.disabled) return;
		if (item.submenu) return;
		item.action?.();
		onclose();
	}
</script>

<div
	class="context-menu"
	bind:this={menuEl}
	style:left="{adjustedX}px"
	style:top="{adjustedY}px"
>
	{#each items as item, i (i)}
		{#if item.separator}
			<div class="separator"></div>
		{:else}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="menu-item"
				class:disabled={item.disabled}
				class:has-submenu={!!item.submenu}
				onclick={() => handleItemClick(item)}
				onmouseenter={() => { if (item.submenu) activeSubmenu = i; }}
				onmouseleave={() => { if (item.submenu) activeSubmenu = null; }}
			>
				<span class="item-icon">{item.icon ?? ''}</span>
				<span class="item-label">{item.label}</span>
				{#if item.submenu}
					<svg class="submenu-arrow" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
						<polygon points="3,1 8,5 3,9" />
					</svg>
				{/if}

				{#if item.submenu && activeSubmenu === i}
					<div class="submenu">
						{#each item.submenu as subItem, si (subItem.label + '-' + si)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="menu-item" onclick={() => { subItem.action?.(); onclose(); }}>
								<span class="item-label">{subItem.label}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.context-menu {
		position: fixed;
		min-width: 200px;
		background: rgba(252, 252, 252, 0.96);
		backdrop-filter: blur(var(--win-mica-blur));
		-webkit-backdrop-filter: blur(var(--win-mica-blur));
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-md);
		box-shadow: var(--win-shadow-flyout);
		padding: 4px;
		z-index: 99999;
		animation: contextFadeIn 0.12s ease-out;
	}

	@keyframes contextFadeIn {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-radius: var(--win-radius-sm);
		font-size: 13px;
		color: var(--win-text-primary);
		cursor: default;
		position: relative;
		transition: background-color 0.08s ease;
	}

	.menu-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.menu-item.disabled {
		color: var(--win-text-disabled);
		pointer-events: none;
	}

	.item-icon {
		width: 20px;
		text-align: center;
		font-size: 14px;
		flex-shrink: 0;
	}

	.item-label {
		flex: 1;
	}

	.submenu-arrow {
		color: var(--win-text-secondary);
		flex-shrink: 0;
	}

	.separator {
		height: 1px;
		background: rgba(0, 0, 0, 0.06);
		margin: 4px 12px;
	}

	.submenu {
		position: absolute;
		left: calc(100% + 2px);
		top: -4px;
		min-width: 160px;
		background: rgba(252, 252, 252, 0.96);
		backdrop-filter: blur(var(--win-mica-blur));
		-webkit-backdrop-filter: blur(var(--win-mica-blur));
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-md);
		box-shadow: var(--win-shadow-flyout);
		padding: 4px;
	}
</style>
