<script lang="ts">
	let searchQuery = $state('');
	let selectedCity = $state('Seattle');

	interface WeatherDay {
		day: string;
		high: number;
		low: number;
		icon: string;
		condition: string;
		precipitation: number;
	}

	interface CityWeather {
		city: string;
		temp: number;
		condition: string;
		icon: string;
		feelsLike: number;
		humidity: number;
		wind: string;
		uv: number;
		visibility: string;
		pressure: string;
		forecast: WeatherDay[];
	}

	const weatherData: Record<string, CityWeather> = {
		Seattle: {
			city: 'Seattle, WA',
			temp: 52,
			condition: 'Partly Cloudy',
			icon: 'partly-cloudy',
			feelsLike: 49,
			humidity: 72,
			wind: '8 mph SW',
			uv: 3,
			visibility: '10 mi',
			pressure: '30.12 in',
			forecast: [
				{ day: 'Today', high: 54, low: 42, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 20 },
				{ day: 'Tue', high: 51, low: 40, icon: 'rain', condition: 'Rain', precipitation: 80 },
				{ day: 'Wed', high: 49, low: 38, icon: 'rain', condition: 'Showers', precipitation: 60 },
				{ day: 'Thu', high: 53, low: 41, icon: 'cloudy', condition: 'Cloudy', precipitation: 30 },
				{ day: 'Fri', high: 56, low: 43, icon: 'sunny', condition: 'Sunny', precipitation: 5 },
			],
		},
		'New York': {
			city: 'New York, NY',
			temp: 38,
			condition: 'Clear',
			icon: 'sunny',
			feelsLike: 32,
			humidity: 45,
			wind: '12 mph NW',
			uv: 2,
			visibility: '10 mi',
			pressure: '30.24 in',
			forecast: [
				{ day: 'Today', high: 40, low: 28, icon: 'sunny', condition: 'Clear', precipitation: 0 },
				{ day: 'Tue', high: 42, low: 30, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 10 },
				{ day: 'Wed', high: 38, low: 26, icon: 'snow', condition: 'Snow', precipitation: 70 },
				{ day: 'Thu', high: 35, low: 24, icon: 'cloudy', condition: 'Cloudy', precipitation: 40 },
				{ day: 'Fri', high: 44, low: 32, icon: 'sunny', condition: 'Sunny', precipitation: 5 },
			],
		},
		London: {
			city: 'London, UK',
			temp: 46,
			condition: 'Overcast',
			icon: 'cloudy',
			feelsLike: 42,
			humidity: 85,
			wind: '15 mph W',
			uv: 1,
			visibility: '6 mi',
			pressure: '29.88 in',
			forecast: [
				{ day: 'Today', high: 48, low: 38, icon: 'cloudy', condition: 'Overcast', precipitation: 40 },
				{ day: 'Tue', high: 46, low: 36, icon: 'rain', condition: 'Rain', precipitation: 90 },
				{ day: 'Wed', high: 44, low: 34, icon: 'rain', condition: 'Rain', precipitation: 75 },
				{ day: 'Thu', high: 47, low: 37, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 30 },
				{ day: 'Fri', high: 50, low: 40, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 25 },
			],
		},
		Tokyo: {
			city: 'Tokyo, JP',
			temp: 55,
			condition: 'Sunny',
			icon: 'sunny',
			feelsLike: 53,
			humidity: 55,
			wind: '6 mph E',
			uv: 4,
			visibility: '10 mi',
			pressure: '30.06 in',
			forecast: [
				{ day: 'Today', high: 58, low: 45, icon: 'sunny', condition: 'Sunny', precipitation: 0 },
				{ day: 'Tue', high: 56, low: 44, icon: 'sunny', condition: 'Clear', precipitation: 5 },
				{ day: 'Wed', high: 54, low: 42, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 15 },
				{ day: 'Thu', high: 52, low: 40, icon: 'rain', condition: 'Rain', precipitation: 60 },
				{ day: 'Fri', high: 55, low: 43, icon: 'partly-cloudy', condition: 'Partly Cloudy', precipitation: 20 },
			],
		},
	};

	let currentWeather = $derived(weatherData[selectedCity] || weatherData['Seattle']);

	let cities = $derived(Object.keys(weatherData));

	let filteredCities = $derived(
		searchQuery.trim()
			? cities.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
			: []
	);

	function getWeatherIcon(icon: string): string {
		const icons: Record<string, string> = {
			'sunny': 'sun',
			'partly-cloudy': 'cloud-sun',
			'cloudy': 'cloud',
			'rain': 'rain',
			'snow': 'snow',
		};
		return icons[icon] || 'cloud';
	}

	function selectCity(city: string) {
		selectedCity = city;
		searchQuery = '';
	}
</script>

<div class="weather-app">
	<div class="weather-header">
		<div class="search-bar">
			<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="search-icon">
				<circle cx="9" cy="9" r="6" />
				<line x1="13.5" y1="13.5" x2="18" y2="18" />
			</svg>
			<input
				type="text"
				placeholder="Search for a city..."
				class="search-input"
				bind:value={searchQuery}
			/>
		</div>
		{#if filteredCities.length > 0}
			<div class="search-results">
				{#each filteredCities as city (city)}
					<button class="search-result-item" onclick={() => selectCity(city)}>
						{weatherData[city].city}
					</button>
				{/each}
			</div>
		{/if}
		<div class="city-tabs">
			{#each cities as city (city)}
				<button
					class="city-tab"
					class:active={selectedCity === city}
					onclick={() => selectedCity = city}
				>
					{city}
				</button>
			{/each}
		</div>
	</div>

	<div class="weather-content">
		<div class="current-weather">
			<div class="current-main">
				<div class="weather-icon-large">
					{#if currentWeather.icon === 'sunny'}
						<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#FFB900" /><g stroke="#FFB900" stroke-width="3" stroke-linecap="round">{#each Array(8) as _, i}<line x1={32 + 24 * Math.cos(i * Math.PI / 4)} y1={32 + 24 * Math.sin(i * Math.PI / 4)} x2={32 + 20 * Math.cos(i * Math.PI / 4)} y2={32 + 20 * Math.sin(i * Math.PI / 4)} />{/each}</g></svg>
					{:else if currentWeather.icon === 'partly-cloudy'}
						<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="24" cy="24" r="10" fill="#FFB900" /><path d="M20 36 C20 28 28 24 36 26 C38 20 48 20 50 26 C56 26 56 36 50 36 Z" fill="#B0BEC5" /></svg>
					{:else if currentWeather.icon === 'cloudy'}
						<svg width="64" height="64" viewBox="0 0 64 64"><path d="M16 40 C16 30 24 26 32 28 C34 20 48 20 50 28 C56 28 58 38 52 40 Z" fill="#90A4AE" /><path d="M10 48 C10 40 18 36 26 38 C28 32 40 32 42 38 C48 38 50 46 44 48 Z" fill="#B0BEC5" /></svg>
					{:else if currentWeather.icon === 'rain'}
						<svg width="64" height="64" viewBox="0 0 64 64"><path d="M14 34 C14 24 22 20 32 22 C34 14 48 14 50 22 C56 22 58 32 52 34 Z" fill="#90A4AE" /><line x1="22" y1="40" x2="18" y2="50" stroke="#42A5F5" stroke-width="2" stroke-linecap="round" /><line x1="32" y1="40" x2="28" y2="52" stroke="#42A5F5" stroke-width="2" stroke-linecap="round" /><line x1="42" y1="40" x2="38" y2="50" stroke="#42A5F5" stroke-width="2" stroke-linecap="round" /></svg>
					{:else}
						<svg width="64" height="64" viewBox="0 0 64 64"><path d="M14 34 C14 24 22 20 32 22 C34 14 48 14 50 22 C56 22 58 32 52 34 Z" fill="#90A4AE" /><circle cx="22" cy="44" r="3" fill="white" /><circle cx="32" cy="48" r="3" fill="white" /><circle cx="42" cy="42" r="3" fill="white" /></svg>
					{/if}
				</div>
				<div class="current-temp-info">
					<span class="current-temp">{currentWeather.temp}°</span>
					<span class="current-condition">{currentWeather.condition}</span>
					<span class="current-city">{currentWeather.city}</span>
				</div>
			</div>

			<div class="weather-details">
				<div class="detail-item">
					<span class="detail-label">Feels Like</span>
					<span class="detail-value">{currentWeather.feelsLike}°</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Humidity</span>
					<span class="detail-value">{currentWeather.humidity}%</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Wind</span>
					<span class="detail-value">{currentWeather.wind}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">UV Index</span>
					<span class="detail-value">{currentWeather.uv}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Visibility</span>
					<span class="detail-value">{currentWeather.visibility}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Pressure</span>
					<span class="detail-value">{currentWeather.pressure}</span>
				</div>
			</div>
		</div>

		<div class="forecast-section">
			<h3 class="forecast-title">5-Day Forecast</h3>
			<div class="forecast-list">
				{#each currentWeather.forecast as day (day.day)}
					<div class="forecast-item">
						<span class="forecast-day">{day.day}</span>
						<div class="forecast-icon-small">
							{#if day.icon === 'sunny'}
								<svg width="24" height="24" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#FFB900" /></svg>
							{:else if day.icon === 'partly-cloudy'}
								<svg width="24" height="24" viewBox="0 0 64 64"><circle cx="24" cy="24" r="8" fill="#FFB900" /><path d="M22 36 C22 30 28 27 34 28 C35 24 44 24 46 28 C50 28 50 36 46 36 Z" fill="#B0BEC5" /></svg>
							{:else if day.icon === 'cloudy'}
								<svg width="24" height="24" viewBox="0 0 64 64"><path d="M16 40 C16 32 24 28 32 30 C34 24 46 24 48 30 C52 30 54 38 48 40 Z" fill="#B0BEC5" /></svg>
							{:else if day.icon === 'rain'}
								<svg width="24" height="24" viewBox="0 0 64 64"><path d="M16 30 C16 22 24 18 32 20 C34 14 46 14 48 20 C52 20 54 28 48 30 Z" fill="#90A4AE" /><line x1="26" y1="36" x2="23" y2="44" stroke="#42A5F5" stroke-width="2" /><line x1="38" y1="36" x2="35" y2="44" stroke="#42A5F5" stroke-width="2" /></svg>
							{:else}
								<svg width="24" height="24" viewBox="0 0 64 64"><path d="M16 30 C16 22 24 18 32 20 C34 14 46 14 48 20 C52 20 54 28 48 30 Z" fill="#90A4AE" /><circle cx="26" cy="40" r="2" fill="white" /><circle cx="38" cy="38" r="2" fill="white" /></svg>
							{/if}
						</div>
						<span class="forecast-condition">{day.condition}</span>
						<div class="forecast-temps">
							<span class="forecast-high">{day.high}°</span>
							<div class="temp-bar">
								<div class="temp-bar-fill" style:width="{((day.high - day.low) / 30) * 100}%"></div>
							</div>
							<span class="forecast-low">{day.low}°</span>
						</div>
						<span class="forecast-precip">{day.precipitation}%</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.weather-app {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--win-surface);
	}

	.weather-header {
		padding: 12px 16px 0;
		flex-shrink: 0;
		position: relative;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-sm);
		margin-bottom: 8px;
	}

	.search-icon {
		color: var(--win-text-secondary);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-size: 13px;
		color: var(--win-text-primary);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--win-text-secondary);
	}

	.search-results {
		position: absolute;
		top: 48px;
		left: 16px;
		right: 16px;
		background: rgba(252, 252, 252, 0.98);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--win-radius-sm);
		box-shadow: var(--win-shadow-flyout);
		z-index: 10;
	}

	.search-result-item {
		display: block;
		width: 100%;
		padding: 10px 14px;
		font-size: 13px;
		color: var(--win-text-primary);
		text-align: left;
		transition: background-color 0.08s ease;
	}

	.search-result-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.city-tabs {
		display: flex;
		gap: 4px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		overflow-x: auto;
	}

	.city-tab {
		padding: 6px 14px;
		font-size: 12px;
		color: var(--win-text-secondary);
		border-radius: 16px;
		transition: all 0.08s ease;
		white-space: nowrap;
	}

	.city-tab:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.city-tab.active {
		background: var(--win-accent);
		color: white;
	}

	.weather-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.current-weather {
		margin-bottom: 20px;
	}

	.current-main {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 16px;
	}

	.current-temp-info {
		display: flex;
		flex-direction: column;
	}

	.current-temp {
		font-size: 56px;
		font-weight: 200;
		color: var(--win-text-primary);
		line-height: 1;
	}

	.current-condition {
		font-size: 16px;
		color: var(--win-text-primary);
		margin-top: 4px;
	}

	.current-city {
		font-size: 12px;
		color: var(--win-text-secondary);
	}

	.weather-details {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.detail-item {
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: var(--win-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.detail-label {
		display: block;
		font-size: 11px;
		color: var(--win-text-secondary);
		margin-bottom: 4px;
	}

	.detail-value {
		font-size: 16px;
		font-weight: 500;
		color: var(--win-text-primary);
	}

	.forecast-section {
		margin-top: 8px;
	}

	.forecast-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
		margin-bottom: 8px;
	}

	.forecast-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.forecast-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: var(--win-radius-sm);
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.forecast-day {
		font-size: 13px;
		font-weight: 500;
		color: var(--win-text-primary);
		min-width: 40px;
	}

	.forecast-icon-small {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.forecast-condition {
		font-size: 12px;
		color: var(--win-text-secondary);
		min-width: 80px;
	}

	.forecast-temps {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
	}

	.forecast-high {
		font-size: 13px;
		font-weight: 500;
		color: var(--win-text-primary);
		min-width: 28px;
		text-align: right;
	}

	.forecast-low {
		font-size: 13px;
		color: var(--win-text-secondary);
		min-width: 28px;
	}

	.temp-bar {
		flex: 1;
		height: 4px;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 2px;
		overflow: hidden;
	}

	.temp-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #42A5F5, #FFA726);
		border-radius: 2px;
	}

	.forecast-precip {
		font-size: 12px;
		color: #42A5F5;
		min-width: 30px;
		text-align: right;
	}
</style>
