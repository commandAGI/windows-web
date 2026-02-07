/** Notification center for the Windows 11 simulation. */

export interface Notification {
	id: number;
	appName: string;
	appIcon: string;
	title: string;
	body: string;
	timestamp: number;
	read: boolean;
	action?: () => void;
}

let nextId = 1;

/** Notification store - properties are mutated in-place (Svelte 5 module constraint). */
export const notification_store = $state<{
	items: Notification[];
	toast_items: Notification[];
}>({
	items: [],
	toast_items: [],
});

/** Convenience getters for backwards compat. */
export function getNotifications(): Notification[] {
	return notification_store.items;
}
export function getToasts(): Notification[] {
	return notification_store.toast_items;
}

/** Send a notification. Shows a toast that auto-dismisses, and adds to the notification center. */
export function notify(opts: {
	appName: string;
	appIcon: string;
	title: string;
	body: string;
	action?: () => void;
}): number {
	const id = nextId++;
	const notification: Notification = {
		id,
		appName: opts.appName,
		appIcon: opts.appIcon,
		title: opts.title,
		body: opts.body,
		timestamp: Date.now(),
		read: false,
		action: opts.action,
	};

	notification_store.items = [notification, ...notification_store.items];
	notification_store.toast_items = [...notification_store.toast_items, notification];

	// Auto-dismiss toast after 5 seconds
	setTimeout(() => {
		dismissToast(id);
	}, 5000);

	return id;
}

/** Dismiss a toast (remove from visible toast queue). */
export function dismissToast(id: number): void {
	notification_store.toast_items = notification_store.toast_items.filter((t) => t.id !== id);
}

/** Mark a notification as read. */
export function markRead(id: number): void {
	const n = notification_store.items.find((n) => n.id === id);
	if (n) n.read = true;
}

/** Mark all notifications as read. */
export function markAllRead(): void {
	for (const n of notification_store.items) {
		n.read = true;
	}
}

/** Remove a single notification. */
export function removeNotification(id: number): void {
	notification_store.items = notification_store.items.filter((n) => n.id !== id);
}

/** Clear all notifications. */
export function clearAll(): void {
	notification_store.items = [];
}

/** Get count of unread notifications. */
export function unreadCount(): number {
	return notification_store.items.filter((n) => !n.read).length;
}
