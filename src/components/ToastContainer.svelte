<script lang="ts">
	import {
		notification_store,
		dismissToast,
		markRead,
		type Notification,
	} from '../state/notifications.svelte.ts';

	function handleToastClick(n: Notification) {
		dismissToast(n.id);
		markRead(n.id);
		if (n.action) {
			n.action();
		}
	}

	function handleDismiss(e: MouseEvent, id: number) {
		e.stopPropagation();
		dismissToast(id);
	}
</script>

{#if notification_store.toast_items.length > 0}
	<div class="toast-container">
		{#each notification_store.toast_items as toast (toast.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="toast" onclick={() => handleToastClick(toast)}>
				<div class="toast-icon">{toast.appIcon}</div>
				<div class="toast-content">
					<div class="toast-header">
						<span class="toast-app">{toast.appName}</span>
						<button
							class="toast-close"
							title="Dismiss"
							onclick={(e) => handleDismiss(e, toast.id)}
						>
							<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
								<path d="M9.35 3.35L6.71 6l2.64 2.65-.71.7L6 6.71 3.35 9.35l-.7-.7L5.29 6 2.65 3.35l.7-.7L6 5.29l2.65-2.64.7.7z"/>
							</svg>
						</button>
					</div>
					<span class="toast-title">{toast.title}</span>
					<span class="toast-body">{toast.body}</span>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: calc(var(--taskbar-height) + 12px);
		right: 12px;
		display: flex;
		flex-direction: column-reverse;
		gap: 8px;
		z-index: 11000;
		pointer-events: none;
	}

	.toast {
		width: 340px;
		background: var(--win-surface-flyout);
		backdrop-filter: blur(var(--win-mica-blur));
		-webkit-backdrop-filter: blur(var(--win-mica-blur));
		border: 1px solid var(--win-surface-stroke-default);
		border-radius: var(--win-radius-md);
		box-shadow: var(--win-shadow-dialog);
		padding: 12px 14px;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		cursor: default;
		pointer-events: auto;
		animation: toastSlideIn 0.2s ease-out;
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.toast:hover {
		background: rgba(248, 248, 248, 0.98);
	}

	@keyframes toastSlideIn {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toast-icon {
		font-size: 20px;
		line-height: 1;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.toast-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.toast-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.toast-app {
		font-size: 11px;
		font-weight: 600;
		color: var(--win-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.toast-close {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		opacity: 0;
		transition: opacity 0.1s ease, background-color 0.1s ease;
	}

	.toast:hover .toast-close {
		opacity: 1;
	}

	.toast-close:hover {
		background: rgba(0, 0, 0, 0.06);
		color: var(--win-text-primary);
	}

	.toast-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--win-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.toast-body {
		font-size: 12px;
		color: var(--win-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.4;
	}
</style>
