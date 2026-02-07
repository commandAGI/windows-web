/**
 * PostMessage communication bridge for the windows-web Svelte 5 app.
 *
 * When the app runs inside an iframe on the CommandAGI platform, this module:
 *   - Listens for messages from the parent with `source: 'commandagi-embed'`
 *   - Sends a `simulation-ready` signal on initialization
 *   - Sends periodic heartbeats every 5 seconds
 *   - Handles `screenshot-request` by capturing the page via html2canvas
 *   - Handles `event-forward` with an acknowledgement
 */

import type html2canvasModule from 'html2canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScreenshotRequestMessage {
	source: 'commandagi-embed';
	type: 'screenshot-request';
	requestId: string;
}

interface EventForwardMessage {
	source: 'commandagi-embed';
	type: 'event-forward';
	requestId?: string;
	eventType: string;
	payload: Record<string, unknown>;
}

type InboundMessage = ScreenshotRequestMessage | EventForwardMessage;

interface SimulationReadyMessage {
	source: 'commandagi-simulation';
	type: 'simulation-ready';
	environmentType: 'windows-webapp';
}

interface HeartbeatMessage {
	source: 'commandagi-simulation';
	type: 'heartbeat';
}

interface ScreenshotResponseMessage {
	source: 'commandagi-simulation';
	type: 'screenshot-response';
	requestId: string;
	dataUrl?: string;
	error?: string;
}

interface EventForwardAckMessage {
	source: 'commandagi-simulation';
	type: 'event-forward-ack';
	requestId?: string;
	eventType: string;
}

type OutboundMessage =
	| SimulationReadyMessage
	| HeartbeatMessage
	| ScreenshotResponseMessage
	| EventForwardAckMessage;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function postToParent(message: OutboundMessage): void {
	try {
		window.parent.postMessage(message, '*');
	} catch {
		// Silently ignore -- the parent may not exist (standalone mode).
	}
}

function isInboundMessage(data: unknown): data is InboundMessage {
	return (
		typeof data === 'object' &&
		data !== null &&
		(data as Record<string, unknown>).source === 'commandagi-embed' &&
		typeof (data as Record<string, unknown>).type === 'string'
	);
}

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------

let html2canvas: typeof html2canvasModule | null = null;

async function captureScreenshot(): Promise<string> {
	if (!html2canvas) {
		const mod = await import('html2canvas');
		html2canvas = mod.default ?? (mod as unknown as typeof html2canvasModule);
	}

	const canvas = await html2canvas(document.body, {
		scale: 1,
		useCORS: true,
		allowTaint: true,
		logging: false,
		width: window.innerWidth,
		height: window.innerHeight,
		windowWidth: window.innerWidth,
		windowHeight: window.innerHeight,
	});

	return canvas.toDataURL('image/png', 0.8);
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMessage(event: MessageEvent): Promise<void> {
	const { data } = event;

	if (!isInboundMessage(data)) {
		return;
	}

	switch (data.type) {
		case 'screenshot-request': {
			try {
				const dataUrl = await captureScreenshot();
				postToParent({
					source: 'commandagi-simulation',
					type: 'screenshot-response',
					requestId: data.requestId,
					dataUrl,
				});
			} catch (err) {
				postToParent({
					source: 'commandagi-simulation',
					type: 'screenshot-response',
					requestId: data.requestId,
					error: err instanceof Error ? err.message : String(err),
				});
			}
			break;
		}

		case 'event-forward': {
			postToParent({
				source: 'commandagi-simulation',
				type: 'event-forward-ack',
				requestId: data.requestId,
				eventType: data.eventType,
			});
			break;
		}

		default:
			break;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function initEmbedBridge(): () => void {
	window.addEventListener('message', handleMessage);

	postToParent({
		source: 'commandagi-simulation',
		type: 'simulation-ready',
		environmentType: 'windows-webapp',
	});

	heartbeatTimer = setInterval(() => {
		postToParent({
			source: 'commandagi-simulation',
			type: 'heartbeat',
		});
	}, 5_000);

	return () => {
		window.removeEventListener('message', handleMessage);
		if (heartbeatTimer !== null) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
	};
}
