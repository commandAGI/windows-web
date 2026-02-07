<script lang="ts">
	import { onMount } from 'svelte';
	import { copyText, pasteText } from '../../state/clipboard.svelte';

	let displayValue = $state('0');
	let firstOperand = $state<number | null>(null);
	let operator = $state<string | null>(null);
	let waitingForSecond = $state(false);
	let activeOperator = $state<string | null>(null);
	let memory = $state(0);
	let showHistory = $state(false);
	let history = $state<string[]>([]);

	let displayFontSize = $derived.by(() => {
		const len = displayValue.length;
		if (len <= 8) return '42px';
		if (len <= 12) return '32px';
		if (len <= 16) return '24px';
		return '20px';
	});

	function formatDisplay(value: string): string {
		if (value === 'Error') return value;
		const isNeg = value.startsWith('-');
		const abs = isNeg ? value.slice(1) : value;
		if (abs.includes('.')) {
			const [intPart, decPart] = abs.split('.');
			const formatted = Number(intPart).toLocaleString('en-US');
			return (isNeg ? '-' : '') + formatted + '.' + decPart;
		}
		const formatted = Number(abs).toLocaleString('en-US');
		return isNeg ? '-' + formatted : formatted;
	}

	let formattedDisplay = $derived(formatDisplay(displayValue));

	function inputDigit(digit: string) {
		if (displayValue === 'Error') {
			displayValue = digit;
			return;
		}
		if (waitingForSecond) {
			displayValue = digit;
			waitingForSecond = false;
			activeOperator = operator;
			return;
		}
		if (displayValue === '0' && digit !== '0') {
			displayValue = digit;
		} else if (displayValue === '0' && digit === '0') {
			// keep 0
		} else if (displayValue.replace('.', '').replace('-', '').length >= 16) {
			// max digits
		} else {
			displayValue = displayValue + digit;
		}
	}

	function inputDecimal() {
		if (displayValue === 'Error') {
			displayValue = '0.';
			return;
		}
		if (waitingForSecond) {
			displayValue = '0.';
			waitingForSecond = false;
			activeOperator = operator;
			return;
		}
		if (!displayValue.includes('.')) displayValue += '.';
	}

	function calculate(op: string, a: number, b: number): number {
		switch (op) {
			case '+':
				return a + b;
			case '-':
				return a - b;
			case '*':
				return a * b;
			case '/':
				return b === 0 ? NaN : a / b;
			default:
				return b;
		}
	}

	function formatResult(value: number): string {
		if (!isFinite(value) || isNaN(value)) return 'Error';
		if (Math.abs(value) >= 1e16 || (Math.abs(value) < 1e-16 && value !== 0))
			return value.toExponential(4);
		const rounded = parseFloat(value.toPrecision(16));
		return String(rounded);
	}

	function handleOperator(nextOp: string) {
		if (displayValue === 'Error') {
			clearAll();
			return;
		}
		const current = parseFloat(displayValue);
		if (firstOperand === null) {
			firstOperand = current;
		} else if (operator && !waitingForSecond) {
			const result = calculate(operator, firstOperand, current);
			const formatted = formatResult(result);
			displayValue = formatted;
			firstOperand = formatted === 'Error' ? null : parseFloat(formatted);
			if (formatted === 'Error') {
				operator = null;
				activeOperator = null;
				return;
			}
		}
		operator = nextOp;
		activeOperator = nextOp;
		waitingForSecond = true;
	}

	function handleEquals() {
		if (displayValue === 'Error') {
			clearAll();
			return;
		}
		if (operator === null || firstOperand === null) {
			activeOperator = null;
			return;
		}
		const current = parseFloat(displayValue);
		const result = calculate(operator, firstOperand, current);
		const formatted = formatResult(result);
		const opSymbol = operator === '*' ? '\u00d7' : operator === '/' ? '\u00f7' : operator;
		history = [...history, `${firstOperand} ${opSymbol} ${current} = ${formatted}`];
		displayValue = formatted;
		firstOperand = null;
		operator = null;
		activeOperator = null;
		waitingForSecond = false;
	}

	function clearAll() {
		displayValue = '0';
		firstOperand = null;
		operator = null;
		waitingForSecond = false;
		activeOperator = null;
	}

	function clearEntry() {
		displayValue = '0';
	}

	function handleClearButton() {
		if (displayValue === '0' && firstOperand === null && operator === null) {
			clearAll();
		} else {
			clearEntry();
		}
	}

	function toggleSign() {
		if (displayValue === 'Error' || displayValue === '0') return;
		displayValue = displayValue.startsWith('-') ? displayValue.slice(1) : '-' + displayValue;
	}

	function handlePercent() {
		if (displayValue === 'Error') return;
		const current = parseFloat(displayValue);
		if (firstOperand !== null && operator) {
			displayValue = formatResult(firstOperand * (current / 100));
		} else {
			displayValue = formatResult(current / 100);
		}
	}

	function handleReciprocal() {
		if (displayValue === 'Error') return;
		const v = parseFloat(displayValue);
		displayValue = formatResult(1 / v);
	}

	function handleSquare() {
		if (displayValue === 'Error') return;
		const v = parseFloat(displayValue);
		displayValue = formatResult(v * v);
	}

	function handleSqrt() {
		if (displayValue === 'Error') return;
		const v = parseFloat(displayValue);
		displayValue = formatResult(Math.sqrt(v));
	}

	function backspace() {
		if (
			displayValue === 'Error' ||
			displayValue.length <= 1 ||
			(displayValue.length === 2 && displayValue.startsWith('-'))
		) {
			displayValue = '0';
		} else {
			displayValue = displayValue.slice(0, -1);
		}
	}

	function memClear() {
		memory = 0;
	}
	function memRecall() {
		displayValue = String(memory);
	}
	function memAdd() {
		memory += parseFloat(displayValue);
	}
	function memSubtract() {
		memory -= parseFloat(displayValue);
	}
	function memStore() {
		memory = parseFloat(displayValue);
	}

	let clearLabel = $derived(
		displayValue === '0' && firstOperand === null && operator === null ? 'C' : 'CE'
	);

	function handleCopy() {
		// Copy the raw display value (not formatted with commas)
		copyText(displayValue);
	}

	function handlePaste() {
		const text = pasteText();
		if (text === null) return;
		// Strip whitespace and commas, then validate as a number
		const cleaned = text.trim().replace(/,/g, '');
		if (cleaned === '' || isNaN(Number(cleaned))) return;
		// Parse and re-format to keep display consistent
		const num = parseFloat(cleaned);
		displayValue = formatResult(num);
		waitingForSecond = false;
	}

	// Keyboard input handler
	function handleKeydown(e: KeyboardEvent) {
		// Handle copy/paste shortcuts
		if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
			e.preventDefault();
			handleCopy();
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
			e.preventDefault();
			handlePaste();
			return;
		}
		// Prevent default for keys we handle
		if (e.key >= '0' && e.key <= '9') {
			e.preventDefault();
			inputDigit(e.key);
		} else if (e.key === '.') {
			e.preventDefault();
			inputDecimal();
		} else if (e.key === '+') {
			e.preventDefault();
			handleOperator('+');
		} else if (e.key === '-') {
			e.preventDefault();
			handleOperator('-');
		} else if (e.key === '*') {
			e.preventDefault();
			handleOperator('*');
		} else if (e.key === '/') {
			e.preventDefault();
			handleOperator('/');
		} else if (e.key === 'Enter' || e.key === '=') {
			e.preventDefault();
			handleEquals();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			clearAll();
		} else if (e.key === 'Backspace') {
			e.preventDefault();
			backspace();
		} else if (e.key === '%') {
			e.preventDefault();
			handlePercent();
		} else if (e.key === 'Delete') {
			e.preventDefault();
			clearEntry();
		}
	}

	onMount(() => {
		// We add the listener to the calculator container via the bind
		// but as a fallback also on the window when calculator is focused
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="calculator-app" tabindex="-1" onkeydown={handleKeydown}>
	<!-- Header -->
	<div class="calc-header">
		<span class="calc-title">Standard</span>
		<button
			class="history-btn"
			onclick={() => (showHistory = !showHistory)}
			title="History"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
				/>
			</svg>
		</button>
	</div>

	<!-- Main content wrapper -->
	<div class="calc-main-wrapper">
		<!-- Calculator main content -->
		<div class="calc-main" class:calc-main-shrunk={showHistory}>
			<!-- Display -->
			<div class="display" style:font-size={displayFontSize}>
				{formattedDisplay}
			</div>

			<!-- Memory buttons -->
			<div class="memory-row">
				<button class="mem-btn" onclick={memClear} disabled={memory === 0}>MC</button>
				<button class="mem-btn" onclick={memRecall} disabled={memory === 0}>MR</button>
				<button class="mem-btn" onclick={memAdd}>M+</button>
				<button class="mem-btn" onclick={memSubtract}>M-</button>
				<button class="mem-btn" onclick={memStore}>MS</button>
			</div>

			<!-- Button grid -->
			<div class="buttons-grid">
				<button class="btn func" onclick={handlePercent}>%</button>
				<button class="btn func" onclick={handleClearButton}>{clearLabel}</button>
				<button class="btn func" onclick={clearAll}>C</button>
				<button class="btn func" onclick={backspace}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"
						/>
					</svg>
				</button>

				<button class="btn func" onclick={handleReciprocal}>1/x</button>
				<button class="btn func" onclick={handleSquare}>x&sup2;</button>
				<button class="btn func" onclick={handleSqrt}>&radic;x</button>
				<button
					class="btn op"
					class:active-op={activeOperator === '/'}
					onclick={() => handleOperator('/')}>&divide;</button
				>

				<button class="btn num" onclick={() => inputDigit('7')}>7</button>
				<button class="btn num" onclick={() => inputDigit('8')}>8</button>
				<button class="btn num" onclick={() => inputDigit('9')}>9</button>
				<button
					class="btn op"
					class:active-op={activeOperator === '*'}
					onclick={() => handleOperator('*')}>&times;</button
				>

				<button class="btn num" onclick={() => inputDigit('4')}>4</button>
				<button class="btn num" onclick={() => inputDigit('5')}>5</button>
				<button class="btn num" onclick={() => inputDigit('6')}>6</button>
				<button
					class="btn op"
					class:active-op={activeOperator === '-'}
					onclick={() => handleOperator('-')}>&minus;</button
				>

				<button class="btn num" onclick={() => inputDigit('1')}>1</button>
				<button class="btn num" onclick={() => inputDigit('2')}>2</button>
				<button class="btn num" onclick={() => inputDigit('3')}>3</button>
				<button
					class="btn op"
					class:active-op={activeOperator === '+'}
					onclick={() => handleOperator('+')}>+</button
				>

				<button class="btn num" onclick={toggleSign}>+/-</button>
				<button class="btn num" onclick={() => inputDigit('0')}>0</button>
				<button class="btn num" onclick={inputDecimal}>.</button>
				<button class="btn equals" onclick={handleEquals}>=</button>
			</div>
		</div>

		<!-- History side panel -->
		{#if showHistory}
			<div class="history-panel">
				<div class="history-header">
					<span>History</span>
					<div class="history-actions">
						<button
							class="history-clear"
							onclick={() => {
								history = [];
							}}
							title="Clear history"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
								/>
							</svg>
						</button>
						<button
							class="history-close-btn"
							onclick={() => (showHistory = false)}
							title="Close history"
						>
							<svg width="10" height="10" viewBox="0 0 10 10">
								<line
									x1="2"
									y1="2"
									x2="8"
									y2="8"
									stroke="currentColor"
									stroke-width="1.2"
								/>
								<line
									x1="8"
									y1="2"
									x2="2"
									y2="8"
									stroke="currentColor"
									stroke-width="1.2"
								/>
							</svg>
						</button>
					</div>
				</div>
				<div class="history-list">
					{#if history.length === 0}
						<span class="history-empty">There's no history yet</span>
					{:else}
						{#each history as item}
							<div class="history-item">{item}</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.calculator-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--win-surface);
		position: relative;
		outline: none;
	}

	.calc-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		flex-shrink: 0;
	}

	.calc-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--win-text-primary);
	}

	.history-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
	}

	.history-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.calc-main-wrapper {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 0;
	}

	.calc-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		transition: flex 0.2s ease;
	}

	.calc-main-shrunk {
		flex: 1;
	}

	.display {
		text-align: right;
		padding: 0 16px 8px;
		font-size: 42px;
		font-weight: 300;
		color: var(--win-text-primary);
		min-height: 64px;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		overflow: hidden;
		word-break: break-all;
		flex-shrink: 0;
	}

	.memory-row {
		display: flex;
		gap: 2px;
		padding: 2px 8px 6px;
		flex-shrink: 0;
	}

	.mem-btn {
		flex: 1;
		padding: 4px;
		font-size: 12px;
		color: var(--win-text-primary);
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
	}

	.mem-btn:not(:disabled):hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.mem-btn:disabled {
		color: var(--win-text-disabled);
	}

	.buttons-grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2px;
		padding: 2px 8px 8px;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
		min-height: 40px;
		cursor: default;
	}

	.btn.num {
		background: rgba(255, 255, 255, 0.7);
		color: var(--win-text-primary);
		font-weight: 500;
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.btn.num:hover {
		background: rgba(255, 255, 255, 0.9);
	}

	.btn.num:active {
		background: rgba(255, 255, 255, 0.5);
	}

	.btn.func {
		background: rgba(249, 249, 249, 0.6);
		color: var(--win-text-primary);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.btn.func:hover {
		background: rgba(249, 249, 249, 0.9);
	}

	.btn.func:active {
		background: rgba(249, 249, 249, 0.4);
	}

	.btn.op {
		background: rgba(249, 249, 249, 0.6);
		color: var(--win-text-primary);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.btn.op:hover {
		background: rgba(249, 249, 249, 0.9);
	}

	.btn.op.active-op {
		background: var(--win-accent);
		color: white;
	}

	.btn.op.active-op:hover {
		background: var(--win-accent-hover);
	}

	.btn.equals {
		background: var(--win-accent);
		color: white;
		font-weight: 600;
		font-size: 20px;
		border: 1px solid var(--win-accent);
	}

	.btn.equals:hover {
		background: var(--win-accent-hover);
	}

	.btn.equals:active {
		background: var(--win-accent-dark);
	}

	/* History panel - side panel */
	.history-panel {
		width: 200px;
		background: rgba(252, 252, 252, 0.96);
		backdrop-filter: blur(20px);
		border-left: 1px solid rgba(0, 0, 0, 0.06);
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.history-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 12px;
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
		flex-shrink: 0;
	}

	.history-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.history-clear {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		transition: background-color 0.08s ease;
	}

	.history-clear:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.history-close-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		transition: background-color 0.08s ease;
	}

	.history-close-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px 12px;
	}

	.history-empty {
		font-size: 13px;
		color: var(--win-text-secondary);
		text-align: center;
		display: block;
		margin-top: 20px;
	}

	.history-item {
		padding: 8px 0;
		font-size: 13px;
		color: var(--win-text-primary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.03);
		text-align: right;
	}
</style>
