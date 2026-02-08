<script lang="ts">
	interface CalendarEvent {
		id: number;
		title: string;
		date: string; // YYYY-MM-DD
		time: string;
		duration: string;
		color: string;
	}

	let today = $state(new Date());
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth());
	let selectedDate = $state<string | null>(null);
	let showEventForm = $state(false);
	let newEventTitle = $state('');
	let newEventTime = $state('09:00');
	let newEventDuration = $state('1 hour');

	let events = $state<CalendarEvent[]>([
		{ id: 1, title: 'Team Standup', date: formatDate(today), time: '9:00 AM', duration: '30 min', color: '#0078d4' },
		{ id: 2, title: 'Design Review', date: formatDate(today), time: '2:00 PM', duration: '1 hour', color: '#e74856' },
		{ id: 3, title: 'Lunch with Sarah', date: formatDate(addDays(today, 1)), time: '12:00 PM', duration: '1 hour', color: '#00cc6a' },
		{ id: 4, title: 'Sprint Planning', date: formatDate(addDays(today, 2)), time: '10:00 AM', duration: '2 hours', color: '#886ce4' },
		{ id: 5, title: 'Doctor Appointment', date: formatDate(addDays(today, 5)), time: '3:30 PM', duration: '1 hour', color: '#e74856' },
		{ id: 6, title: 'Project Deadline', date: formatDate(addDays(today, 7)), time: '5:00 PM', duration: 'All day', color: '#ff8c00' },
	]);

	function formatDate(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function addDays(d: Date, n: number): Date {
		const result = new Date(d);
		result.setDate(result.getDate() + n);
		return result;
	}

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let monthLabel = $derived(`${monthNames[viewMonth]} ${viewYear}`);

	let calendarDays = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1).getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

		const days: { date: number; month: 'prev' | 'current' | 'next'; dateStr: string }[] = [];

		// Previous month
		for (let i = firstDay - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			const m = viewMonth === 0 ? 11 : viewMonth - 1;
			const y = viewMonth === 0 ? viewYear - 1 : viewYear;
			days.push({ date: d, month: 'prev', dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
		}

		// Current month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({ date: i, month: 'current', dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
		}

		// Next month
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const m = viewMonth === 11 ? 0 : viewMonth + 1;
			const y = viewMonth === 11 ? viewYear + 1 : viewYear;
			days.push({ date: i, month: 'next', dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
		}

		return days;
	});

	let todayStr = $derived(formatDate(today));

	function getEventsForDate(dateStr: string): CalendarEvent[] {
		return events.filter(e => e.date === dateStr);
	}

	let selectedDateEvents = $derived(selectedDate ? getEventsForDate(selectedDate) : []);

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	function goToday() {
		viewYear = today.getFullYear();
		viewMonth = today.getMonth();
		selectedDate = todayStr;
	}

	function selectDate(dateStr: string) {
		selectedDate = dateStr;
	}

	function addEvent() {
		if (!newEventTitle.trim() || !selectedDate) return;
		const id = Math.max(0, ...events.map(e => e.id)) + 1;
		const colors = ['#0078d4', '#e74856', '#00cc6a', '#886ce4', '#ff8c00'];
		events = [...events, {
			id,
			title: newEventTitle.trim(),
			date: selectedDate,
			time: newEventTime,
			duration: newEventDuration,
			color: colors[id % colors.length],
		}];
		newEventTitle = '';
		showEventForm = false;
	}

	function deleteEvent(id: number) {
		events = events.filter(e => e.id !== id);
	}

	function formatSelectedDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="calendar-app">
	<div class="calendar-left">
		<div class="calendar-nav">
			<button class="nav-btn" onclick={prevMonth}>
				<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="8,2 4,6 8,10" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
			</button>
			<span class="month-label">{monthLabel}</span>
			<button class="nav-btn" onclick={nextMonth}>
				<svg width="12" height="12" viewBox="0 0 12 12"><polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
			</button>
			<button class="today-btn" onclick={goToday}>Today</button>
		</div>

		<div class="calendar-grid">
			<div class="day-headers">
				{#each dayNames as day (day)}
					<div class="day-header">{day}</div>
				{/each}
			</div>
			<div class="days-grid">
				{#each calendarDays as day (day.dateStr)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="day-cell"
						class:other-month={day.month !== 'current'}
						class:today={day.dateStr === todayStr}
						class:selected={day.dateStr === selectedDate}
						class:has-events={getEventsForDate(day.dateStr).length > 0}
						onclick={() => selectDate(day.dateStr)}
					>
						<span class="day-number">{day.date}</span>
						{#if getEventsForDate(day.dateStr).length > 0}
							<div class="event-dots">
								{#each getEventsForDate(day.dateStr).slice(0, 3) as evt (evt.id)}
									<div class="event-dot" style:background={evt.color}></div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="calendar-right">
		{#if selectedDate}
			<div class="date-detail">
				<div class="date-header">
					<h3 class="date-title">{formatSelectedDate(selectedDate)}</h3>
					<button class="add-event-btn" onclick={() => showEventForm = !showEventForm}>
						<svg width="14" height="14" viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" /><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" /></svg>
					</button>
				</div>

				{#if showEventForm}
					<div class="event-form">
						<input type="text" class="event-input" placeholder="Event title" bind:value={newEventTitle} onkeydown={(e) => { if (e.key === 'Enter') addEvent(); }} />
						<div class="event-form-row">
							<input type="time" class="event-time-input" bind:value={newEventTime} />
							<select class="event-duration-select" bind:value={newEventDuration}>
								<option>30 min</option>
								<option>1 hour</option>
								<option>2 hours</option>
								<option>All day</option>
							</select>
						</div>
						<div class="event-form-actions">
							<button class="form-btn primary" onclick={addEvent}>Add</button>
							<button class="form-btn" onclick={() => showEventForm = false}>Cancel</button>
						</div>
					</div>
				{/if}

				<div class="events-list">
					{#each selectedDateEvents as evt (evt.id)}
						<div class="event-card">
							<div class="event-color-bar" style:background={evt.color}></div>
							<div class="event-info">
								<span class="event-title">{evt.title}</span>
								<span class="event-time">{evt.time} - {evt.duration}</span>
							</div>
							<button class="delete-event-btn" onclick={() => deleteEvent(evt.id)} title="Delete">
								<svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.2" /><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.2" /></svg>
							</button>
						</div>
					{/each}
					{#if selectedDateEvents.length === 0 && !showEventForm}
						<div class="no-events">No events scheduled</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="no-selection">
				<p>Select a date to view events</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.calendar-app {
		height: 100%;
		display: flex;
		background: var(--win-surface);
	}

	.calendar-left {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 16px;
		min-width: 0;
	}

	.calendar-nav {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		flex-shrink: 0;
	}

	.nav-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
	}

	.nav-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.month-label {
		font-size: 16px;
		font-weight: 600;
		color: var(--win-text-primary);
		flex: 1;
	}

	.today-btn {
		padding: 4px 12px;
		font-size: 12px;
		color: var(--win-accent);
		border: 1px solid var(--win-accent);
		border-radius: var(--win-radius-sm);
		transition: all 0.08s ease;
	}

	.today-btn:hover {
		background: rgba(0, 120, 212, 0.08);
	}

	.calendar-grid {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.day-headers {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 4px;
	}

	.day-header {
		text-align: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--win-text-secondary);
		padding: 4px;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1px;
		flex: 1;
	}

	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px 2px;
		border-radius: var(--win-radius-sm);
		cursor: pointer;
		transition: background-color 0.08s ease;
		min-height: 44px;
	}

	.day-cell:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.day-cell.other-month {
		opacity: 0.35;
	}

	.day-cell.today .day-number {
		background: var(--win-accent);
		color: white;
		border-radius: 50%;
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.day-cell.selected {
		background: rgba(0, 120, 212, 0.08);
	}

	.day-number {
		font-size: 13px;
		color: var(--win-text-primary);
		line-height: 1;
	}

	.event-dots {
		display: flex;
		gap: 2px;
		margin-top: 3px;
	}

	.event-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
	}

	/* Right panel */
	.calendar-right {
		width: 280px;
		border-left: 1px solid rgba(0, 0, 0, 0.06);
		overflow-y: auto;
		flex-shrink: 0;
	}

	.date-detail {
		padding: 16px;
	}

	.date-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.date-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
	}

	.add-event-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--win-accent);
		color: white;
		transition: opacity 0.08s ease;
	}

	.add-event-btn:hover {
		opacity: 0.9;
	}

	.event-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: var(--win-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.06);
		margin-bottom: 12px;
	}

	.event-input {
		padding: 8px 10px;
		font-size: 13px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		outline: none;
	}

	.event-input:focus {
		border-color: var(--win-accent);
	}

	.event-form-row {
		display: flex;
		gap: 8px;
	}

	.event-time-input, .event-duration-select {
		flex: 1;
		padding: 6px 8px;
		font-size: 12px;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: var(--win-radius-sm);
		background: white;
		color: var(--win-text-primary);
		outline: none;
	}

	.event-form-actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
	}

	.form-btn {
		padding: 5px 14px;
		font-size: 12px;
		border-radius: var(--win-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.12);
		color: var(--win-text-primary);
		transition: background-color 0.08s ease;
	}

	.form-btn:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.form-btn.primary {
		background: var(--win-accent);
		color: white;
		border-color: var(--win-accent);
	}

	.form-btn.primary:hover {
		opacity: 0.9;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.event-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: var(--win-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.event-color-bar {
		width: 3px;
		height: 32px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.event-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.event-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--win-text-primary);
	}

	.event-time {
		font-size: 11px;
		color: var(--win-text-secondary);
	}

	.delete-event-btn {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--win-radius-sm);
		color: var(--win-text-secondary);
		opacity: 0;
		transition: all 0.08s ease;
	}

	.event-card:hover .delete-event-btn {
		opacity: 1;
	}

	.delete-event-btn:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #e74856;
	}

	.no-events, .no-selection {
		padding: 24px;
		text-align: center;
		font-size: 13px;
		color: var(--win-text-secondary);
	}
</style>
