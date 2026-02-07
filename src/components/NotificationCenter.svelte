<script lang="ts">
	import {
		notification_store,
		clearAll,
		removeNotification,
		markRead,
		type Notification,
	} from '../state/notifications.svelte.ts';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	/** Group notifications by appName, preserving insertion order. */
	let grouped = $derived.by(() => {
		const map = new Map<string, Notification[]>();
		for (const n of notification_store.items) {
			const list = map.get(n.appName);
			if (list) {
				list.push(n);
			} else {
				map.set(n.appName, [n]);
			}
		}
		return map;
	});

	function handleClearAll() {
		clearAll();
	}

	function handleDismiss(e: MouseEvent, id: number) {
		e.stopPropagation();
		removeNotification(id);
	}

	function handleNotificationClick(n: Notification) {
		markRead(n.id);
		if (n.action) {
			n.action();
			onclose();
		}
	}

	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		if (seconds < 60) return 'Just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="notif-backdrop" onclick={onclose}></div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="notif-center" onclick={(e) => e.stopPropagation()}>
		<div class="notif-header">
			<span class="notif-title">Notifications</span>
			{#if notification_store.items.length > 0}
				<button class="notif-clear-btn" onclick={handleClearAll}>Clear all</button>
			{/if}
		</div>

		{#if notification_store.items.length === 0}
			<div class="notif-empty">
				<svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(0,0,0,0.15)">
					<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
				</svg>
				<span>No new notifications</span>
			</div>
		{:else}
			<div class="notif-list">
				{#each [...grouped] as [appName, items] (appName)}
					<div class="notif-group">
						<div class="notif-group-header">
							<span class="notif-group-icon">{items[0].appIcon}</span>
							<span class="notif-group-name">{appName}</span>
						</div>
						{#each items as n (n.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="notif-item"
								class:notif-unread={!n.read}
								onclick={() => handleNotificationClick(n)}
							>
								<div class="notif-item-content">
									<span class="notif-item-title">{n.title}</span>
									<span class="notif-item-body">{n.body}</span>
									<span class="notif-item-time">{formatRelativeTime(n.timestamp)}</span>
								</div>
								<button
									class="notif-item-dismiss"
									title="Dismiss"
									onclick={(e) => handleDismiss(e, n.id)}
								>
									<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
										<path d="M9.35 3.35L6.71 6l2.64 2.65-.71.7L6 6.71 3.35 9.35l-.7-.7L5.29 6 2.65 3.35l.7-.7L6 5.29l2.65-2.64.7.7z"/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.notif-backdrop {
		position: fixed;
		inset: 0;
		bottom: var(--taskbar-height);
		z-index: 10000;
	}

	.notif-center {
		position: fixed;
		bottom: calc(var(--taskbar-height) + 12px);
		right: 12px;
		width: 360px;
		max-height: calc(100vh - var(--taskbar-height) - 80px);
		background: var(--win-surface-flyout);
		backdrop-filter: blur(var(--win-mica-blur));
		-webkit-backdrop-filter: blur(var(--win-mica-blur));
		border: 1px solid var(--win-surface-stroke-default);
		border-radius: var(--win-radius-md);
		box-shadow: var(--win-shadow-dialog);
		z-index: 10001;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: notifSlideIn 0.15s ease-out;
	}

	@keyframes notifSlideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.notif-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 18px 12px;
		flex-shrink: 0;
	}

	.notif-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
	}

	.notif-clear-btn {
		font-size: 12px;
		color: var(--win-accent);
		padding: 4px 10px;
		border-radius: var(--win-radius-sm);
		cursor: default;
		transition: background-color 0.1s ease;
	}

	.notif-clear-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.notif-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 18px;
		color: var(--win-text-secondary);
		font-size: 13px;
	}

	.notif-list {
		overflow-y: auto;
		padding: 0 8px 8px;
		flex: 1;
	}

	.notif-group {
		margin-bottom: 4px;
	}

	.notif-group-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px 4px;
	}

	.notif-group-icon {
		font-size: 14px;
		line-height: 1;
	}

	.notif-group-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--win-text-secondary);
	}

	.notif-item {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 12px;
		border-radius: var(--win-radius-sm);
		cursor: default;
		transition: background-color 0.1s ease;
		position: relative;
	}

	.notif-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.notif-unread {
		background: rgba(0, 120, 212, 0.04);
	}

	.notif-unread::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--win-accent);
	}

	.notif-item-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.notif-item-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--win-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notif-item-body {
		font-size: 12px;
		color: var(--win-text-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.notif-item-time {
		font-size: 11px;
		color: var(--win-text-disabled);
		margin-top: 2px;
	}

	.notif-item-dismiss {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		opacity: 0;
		transition: opacity 0.1s ease, background-color 0.1s ease;
	}

	.notif-item:hover .notif-item-dismiss {
		opacity: 1;
	}

	.notif-item-dismiss:hover {
		background: rgba(0, 0, 0, 0.06);
		color: var(--win-text-primary);
	}
</style>
