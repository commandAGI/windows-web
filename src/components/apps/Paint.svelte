<script lang="ts">
	import { onMount } from 'svelte';

	type Tool = 'brush' | 'eraser' | 'fill' | 'line' | 'rect' | 'ellipse' | 'picker';

	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let activeTool = $state<Tool>('brush');
	let brushSize = $state(4);
	let color = $state('#000000');
	let secondaryColor = $state('#ffffff');
	let isDrawing = $state(false);
	let lastX = $state(0);
	let lastY = $state(0);
	let startX = $state(0);
	let startY = $state(0);
	let canvasWidth = $state(800);
	let canvasHeight = $state(500);
	let undoStack = $state<ImageData[]>([]);
	let redoStack = $state<ImageData[]>([]);
	let previewCanvas: HTMLCanvasElement | undefined = $state(undefined);
	let mouseX = $state(0);
	let mouseY = $state(0);

	const tools: { id: Tool; icon: string; label: string }[] = [
		{ id: 'brush', icon: 'B', label: 'Brush' },
		{ id: 'eraser', icon: 'E', label: 'Eraser' },
		{ id: 'fill', icon: 'F', label: 'Fill' },
		{ id: 'picker', icon: 'P', label: 'Color Picker' },
		{ id: 'line', icon: 'L', label: 'Line' },
		{ id: 'rect', icon: 'R', label: 'Rectangle' },
		{ id: 'ellipse', icon: 'O', label: 'Ellipse' },
	];

	const palette = [
		'#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
		'#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
		'#c08040', '#ffc080', '#ff8000', '#80ff00', '#00ff80', '#0080ff', '#8000ff', '#ff0080',
	];

	function saveState() {
		if (!ctx || !canvas) return;
		const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
		undoStack = [...undoStack, data];
		redoStack = [];
	}

	function undo() {
		if (!ctx || !canvas || undoStack.length === 0) return;
		const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
		redoStack = [...redoStack, current];
		const prev = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		ctx.putImageData(prev, 0, 0);
	}

	function redo() {
		if (!ctx || !canvas || redoStack.length === 0) return;
		const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
		undoStack = [...undoStack, current];
		const next = redoStack[redoStack.length - 1];
		redoStack = redoStack.slice(0, -1);
		ctx.putImageData(next, 0, 0);
	}

	function clearCanvas() {
		if (!ctx || !canvas) return;
		saveState();
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	function getCanvasPos(e: MouseEvent): { x: number; y: number } {
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}

	function floodFill(startX: number, startY: number, fillColor: string) {
		if (!ctx || !canvas) return;
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;
		const w = canvas.width;
		const h = canvas.height;

		const target = getPixel(data, startX, startY, w);
		const fill = hexToRgb(fillColor);
		if (!fill) return;
		if (target[0] === fill.r && target[1] === fill.g && target[2] === fill.b) return;

		const stack: [number, number][] = [[startX, startY]];
		const visited = new Set<number>();

		while (stack.length > 0) {
			const [x, y] = stack.pop()!;
			const key = y * w + x;
			if (visited.has(key)) continue;
			if (x < 0 || x >= w || y < 0 || y >= h) continue;

			const px = getPixel(data, x, y, w);
			if (Math.abs(px[0] - target[0]) > 20 || Math.abs(px[1] - target[1]) > 20 || Math.abs(px[2] - target[2]) > 20) continue;

			visited.add(key);
			const idx = key * 4;
			data[idx] = fill.r;
			data[idx + 1] = fill.g;
			data[idx + 2] = fill.b;
			data[idx + 3] = 255;

			stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
		}

		ctx.putImageData(imageData, 0, 0);
	}

	function getPixel(data: Uint8ClampedArray, x: number, y: number, w: number): [number, number, number, number] {
		const idx = (y * w + x) * 4;
		return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
	}

	function hexToRgb(hex: string) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
	}

	function handleMouseDown(e: MouseEvent) {
		const pos = getCanvasPos(e);
		isDrawing = true;
		lastX = pos.x;
		lastY = pos.y;
		startX = pos.x;
		startY = pos.y;

		if (activeTool === 'fill') {
			saveState();
			floodFill(Math.floor(pos.x), Math.floor(pos.y), color);
			isDrawing = false;
			return;
		}

		if (activeTool === 'picker') {
			if (!ctx || !canvas) return;
			const pixel = ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
			color = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
			activeTool = 'brush';
			isDrawing = false;
			return;
		}

		if (activeTool === 'brush' || activeTool === 'eraser') {
			saveState();
			if (!ctx) return;
			ctx.beginPath();
			ctx.moveTo(pos.x, pos.y);
			ctx.lineTo(pos.x, pos.y);
			ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;
			ctx.lineWidth = brushSize;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.stroke();
		}

		if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'ellipse') {
			saveState();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const pos = getCanvasPos(e);
		mouseX = pos.x;
		mouseY = pos.y;

		if (!isDrawing || !ctx) return;

		if (activeTool === 'brush' || activeTool === 'eraser') {
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(pos.x, pos.y);
			ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;
			ctx.lineWidth = brushSize;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.stroke();
			lastX = pos.x;
			lastY = pos.y;
		}

		if ((activeTool === 'line' || activeTool === 'rect' || activeTool === 'ellipse') && previewCanvas) {
			const pCtx = previewCanvas.getContext('2d');
			if (!pCtx) return;
			pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
			pCtx.strokeStyle = color;
			pCtx.lineWidth = brushSize;
			pCtx.lineCap = 'round';

			if (activeTool === 'line') {
				pCtx.beginPath();
				pCtx.moveTo(startX, startY);
				pCtx.lineTo(pos.x, pos.y);
				pCtx.stroke();
			} else if (activeTool === 'rect') {
				pCtx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
			} else if (activeTool === 'ellipse') {
				const cx = (startX + pos.x) / 2;
				const cy = (startY + pos.y) / 2;
				const rx = Math.abs(pos.x - startX) / 2;
				const ry = Math.abs(pos.y - startY) / 2;
				pCtx.beginPath();
				pCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
				pCtx.stroke();
			}
		}
	}

	function handleMouseUp(e: MouseEvent) {
		if (!isDrawing || !ctx) return;
		const pos = getCanvasPos(e);

		if (activeTool === 'line') {
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(pos.x, pos.y);
			ctx.strokeStyle = color;
			ctx.lineWidth = brushSize;
			ctx.lineCap = 'round';
			ctx.stroke();
		} else if (activeTool === 'rect') {
			ctx.strokeStyle = color;
			ctx.lineWidth = brushSize;
			ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
		} else if (activeTool === 'ellipse') {
			const cx = (startX + pos.x) / 2;
			const cy = (startY + pos.y) / 2;
			const rx = Math.abs(pos.x - startX) / 2;
			const ry = Math.abs(pos.y - startY) / 2;
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = brushSize;
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			ctx.stroke();
		}

		if (previewCanvas) {
			const pCtx = previewCanvas.getContext('2d');
			if (pCtx) pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		}

		isDrawing = false;
	}

	onMount(() => {
		if (canvas) {
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
			ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			}
		}
		if (previewCanvas) {
			previewCanvas.width = canvasWidth;
			previewCanvas.height = canvasHeight;
		}
	});
</script>

<div class="paint-app">
	<div class="toolbar">
		<div class="toolbar-group">
			<button class="tool-btn action-btn" onclick={undo} title="Undo">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
			</button>
			<button class="tool-btn action-btn" onclick={redo} title="Redo">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
			</button>
		</div>

		<div class="toolbar-separator"></div>

		<div class="toolbar-group tools-group">
			{#each tools as tool (tool.id)}
				<button
					class="tool-btn"
					class:active={activeTool === tool.id}
					onclick={() => activeTool = tool.id}
					title={tool.label}
				>
					<span class="tool-letter">{tool.icon}</span>
				</button>
			{/each}
		</div>

		<div class="toolbar-separator"></div>

		<div class="toolbar-group size-group">
			<label class="size-label">Size:</label>
			<input type="range" min="1" max="30" bind:value={brushSize} class="size-slider" />
			<span class="size-value">{brushSize}px</span>
		</div>

		<div class="toolbar-separator"></div>

		<div class="toolbar-group">
			<button class="tool-btn action-btn" onclick={clearCanvas} title="Clear Canvas">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
			</button>
		</div>
	</div>

	<div class="main-area">
		<div class="color-panel">
			<div class="color-preview-row">
				<div class="color-preview primary" style:background={color} title="Primary color"></div>
				<div class="color-preview secondary" style:background={secondaryColor} title="Secondary color"></div>
			</div>
			<input type="color" bind:value={color} class="color-input" title="Choose color" />
			<div class="palette-grid">
				{#each palette as c (c)}
					<button
						class="palette-swatch"
						class:active={color === c}
						style:background={c}
						onclick={() => color = c}
						title={c}
					></button>
				{/each}
			</div>
		</div>

		<div class="canvas-area">
			<div class="canvas-wrapper">
				<canvas
					bind:this={canvas}
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={() => { isDrawing = false; }}
					class="drawing-canvas"
					style:cursor={activeTool === 'picker' ? 'crosshair' : activeTool === 'fill' ? 'crosshair' : 'crosshair'}
				></canvas>
				<canvas
					bind:this={previewCanvas}
					class="preview-canvas"
				></canvas>
			</div>
		</div>
	</div>

	<div class="status-bar">
		<span>{Math.floor(mouseX)}, {Math.floor(mouseY)}px</span>
		<span>{canvasWidth} x {canvasHeight}px</span>
		<span class="tool-name">{tools.find(t => t.id === activeTool)?.label || ''}</span>
	</div>
</div>

<style>
	.paint-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--win-surface);
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: var(--win-surface);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
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

	.tool-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
		font-size: 12px;
	}

	.tool-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.tool-btn.active {
		background: var(--win-accent);
		color: white;
	}

	.tool-letter {
		font-weight: 700;
		font-size: 13px;
	}

	.action-btn {
		color: var(--win-text-secondary);
	}

	.size-group {
		gap: 6px;
	}

	.size-label {
		font-size: 12px;
		color: var(--win-text-secondary);
	}

	.size-slider {
		width: 80px;
		accent-color: var(--win-accent);
	}

	.size-value {
		font-size: 11px;
		color: var(--win-text-secondary);
		min-width: 32px;
	}

	.main-area {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.color-panel {
		width: 60px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		border-right: 1px solid rgba(0, 0, 0, 0.06);
		background: var(--win-surface);
		flex-shrink: 0;
	}

	.color-preview-row {
		position: relative;
		width: 36px;
		height: 36px;
	}

	.color-preview {
		width: 24px;
		height: 24px;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-radius: 3px;
		position: absolute;
	}

	.color-preview.primary {
		top: 0;
		left: 0;
		z-index: 2;
	}

	.color-preview.secondary {
		bottom: 0;
		right: 0;
		z-index: 1;
	}

	.color-input {
		width: 36px;
		height: 24px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 3px;
		cursor: pointer;
		padding: 0;
	}

	.palette-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2px;
	}

	.palette-swatch {
		width: 18px;
		height: 18px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 2px;
		cursor: pointer;
		transition: transform 0.08s ease;
	}

	.palette-swatch:hover {
		transform: scale(1.2);
		z-index: 1;
	}

	.palette-swatch.active {
		border: 2px solid var(--win-accent);
	}

	.canvas-area {
		flex: 1;
		overflow: auto;
		background: #e0e0e0;
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		padding: 10px;
	}

	.canvas-wrapper {
		position: relative;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.drawing-canvas {
		display: block;
		cursor: crosshair;
	}

	.preview-canvas {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.status-bar {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 4px 12px;
		font-size: 12px;
		color: var(--win-text-secondary);
		background: var(--win-surface);
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		flex-shrink: 0;
	}

	.tool-name {
		margin-left: auto;
	}
</style>
