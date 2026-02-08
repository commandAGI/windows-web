<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type MusicTab = 'playing' | 'library' | 'playlists';

	let activeTab = $state<MusicTab>('playing');
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let volume = $state(75);
	let shuffle = $state(false);
	let repeat = $state<'off' | 'all' | 'one'>('off');
	let intervalId: ReturnType<typeof setInterval> | undefined;

	interface Song {
		id: number;
		title: string;
		artist: string;
		album: string;
		duration: number; // seconds
		color: string; // album art placeholder color
	}

	let currentSongIndex = $state(0);

	const library: Song[] = [
		{ id: 1, title: 'Electric Dreams', artist: 'Neon Pulse', album: 'Synthetic Horizons', duration: 234, color: '#6c5ce7' },
		{ id: 2, title: 'Midnight Drive', artist: 'Chrome Wave', album: 'Night Circuits', duration: 198, color: '#0984e3' },
		{ id: 3, title: 'Digital Sunrise', artist: 'Pixel Rain', album: 'Binary Dawn', duration: 267, color: '#e17055' },
		{ id: 4, title: 'Neon Lights', artist: 'Synth City', album: 'Urban Glow', duration: 212, color: '#00b894' },
		{ id: 5, title: 'Crystal Waves', artist: 'Ocean Drive', album: 'Coastal Dreams', duration: 183, color: '#00cec9' },
		{ id: 6, title: 'Retro Future', artist: 'Time Machine', album: 'Past Forward', duration: 245, color: '#fdcb6e' },
		{ id: 7, title: 'Starlight Path', artist: 'Cosmos', album: 'Galaxy Wanderer', duration: 302, color: '#2d3436' },
		{ id: 8, title: 'Summer Haze', artist: 'Golden Hour', album: 'Warm Evenings', duration: 176, color: '#fab1a0' },
		{ id: 9, title: 'Cloud Nine', artist: 'Aerial View', album: 'Sky High', duration: 221, color: '#74b9ff' },
		{ id: 10, title: 'Deep Focus', artist: 'Zen Mode', album: 'Concentration', duration: 360, color: '#55efc4' },
	];

	interface Playlist {
		id: number;
		name: string;
		songCount: number;
		color: string;
	}

	const playlists: Playlist[] = [
		{ id: 1, name: 'Favorites', songCount: 24, color: '#e74856' },
		{ id: 2, name: 'Chill Vibes', songCount: 18, color: '#00b894' },
		{ id: 3, name: 'Work Focus', songCount: 32, color: '#0984e3' },
		{ id: 4, name: 'Road Trip', songCount: 45, color: '#fdcb6e' },
		{ id: 5, name: 'Night Drive', songCount: 15, color: '#6c5ce7' },
	];

	let currentSong = $derived(library[currentSongIndex]);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}

	let progressPercent = $derived(currentSong ? (currentTime / currentSong.duration) * 100 : 0);

	function togglePlay() {
		isPlaying = !isPlaying;
		if (isPlaying) {
			intervalId = setInterval(() => {
				if (currentTime < currentSong.duration) {
					currentTime += 1;
				} else {
					nextSong();
				}
			}, 1000);
		} else {
			if (intervalId) clearInterval(intervalId);
		}
	}

	function nextSong() {
		currentTime = 0;
		if (shuffle) {
			currentSongIndex = Math.floor(Math.random() * library.length);
		} else {
			currentSongIndex = (currentSongIndex + 1) % library.length;
		}
	}

	function prevSong() {
		currentTime = 0;
		if (currentSongIndex > 0) {
			currentSongIndex--;
		} else {
			currentSongIndex = library.length - 1;
		}
	}

	function playSong(index: number) {
		currentSongIndex = index;
		currentTime = 0;
		if (!isPlaying) togglePlay();
	}

	function seekTo(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const pct = (e.clientX - rect.left) / rect.width;
		currentTime = Math.floor(pct * currentSong.duration);
	}

	function toggleRepeat() {
		if (repeat === 'off') repeat = 'all';
		else if (repeat === 'all') repeat = 'one';
		else repeat = 'off';
	}

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="music-app">
	<div class="music-sidebar">
		<div class="sidebar-header">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
			<span class="app-title">Music</span>
		</div>

		<div class="sidebar-nav">
			<button class="nav-item" class:active={activeTab === 'playing'} onclick={() => activeTab = 'playing'}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
				Now Playing
			</button>
			<button class="nav-item" class:active={activeTab === 'library'} onclick={() => activeTab = 'library'}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
				Library
			</button>
			<button class="nav-item" class:active={activeTab === 'playlists'} onclick={() => activeTab = 'playlists'}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
				Playlists
			</button>
		</div>
	</div>

	<div class="music-main">
		{#if activeTab === 'playing'}
			<div class="now-playing">
				<div class="album-art" style:background={currentSong.color}>
					<svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
				</div>
				<div class="song-info">
					<span class="song-title">{currentSong.title}</span>
					<span class="song-artist">{currentSong.artist}</span>
					<span class="song-album">{currentSong.album}</span>
				</div>

				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="progress-bar" onclick={seekTo}>
					<div class="progress-fill" style:width="{progressPercent}%"></div>
				</div>
				<div class="time-labels">
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(currentSong.duration)}</span>
				</div>

				<div class="playback-controls">
					<button class="control-btn small" class:active={shuffle} onclick={() => shuffle = !shuffle} title="Shuffle">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
					</button>
					<button class="control-btn" onclick={prevSong} title="Previous">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
					</button>
					<button class="control-btn play" onclick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
						{#if isPlaying}
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
						{:else}
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
						{/if}
					</button>
					<button class="control-btn" onclick={nextSong} title="Next">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
					</button>
					<button class="control-btn small" class:active={repeat !== 'off'} onclick={toggleRepeat} title="Repeat">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
						{#if repeat === 'one'}
							<span class="repeat-indicator">1</span>
						{/if}
					</button>
				</div>

				<div class="volume-control">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
					<input type="range" min="0" max="100" bind:value={volume} class="volume-slider" />
					<span class="volume-value">{volume}</span>
				</div>

				<div class="up-next">
					<h4 class="up-next-title">Up Next</h4>
					{#each library.slice(currentSongIndex + 1, currentSongIndex + 4) as song, i (song.id)}
						<button class="up-next-item" onclick={() => playSong(library.indexOf(song))}>
							<div class="mini-art" style:background={song.color}></div>
							<div class="up-next-info">
								<span class="up-next-name">{song.title}</span>
								<span class="up-next-artist">{song.artist}</span>
							</div>
							<span class="up-next-duration">{formatTime(song.duration)}</span>
						</button>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'library'}
			<div class="library-view">
				<h2 class="view-title">Library</h2>
				<div class="library-header">
					<span class="lib-col">#</span>
					<span class="lib-col title-col">Title</span>
					<span class="lib-col">Album</span>
					<span class="lib-col duration-col">Duration</span>
				</div>
				<div class="library-list">
					{#each library as song, i (song.id)}
						<button class="library-item" class:active={currentSongIndex === i} onclick={() => playSong(i)}>
							<span class="lib-col lib-num">
								{#if currentSongIndex === i && isPlaying}
									<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--win-accent)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
								{:else}
									{i + 1}
								{/if}
							</span>
							<div class="lib-col title-col">
								<div class="mini-art" style:background={song.color}></div>
								<div class="lib-song-info">
									<span class="lib-song-title">{song.title}</span>
									<span class="lib-song-artist">{song.artist}</span>
								</div>
							</div>
							<span class="lib-col lib-album">{song.album}</span>
							<span class="lib-col duration-col lib-duration">{formatTime(song.duration)}</span>
						</button>
					{/each}
				</div>
			</div>

		{:else}
			<div class="playlists-view">
				<h2 class="view-title">Playlists</h2>
				<div class="playlists-grid">
					{#each playlists as playlist (playlist.id)}
						<button class="playlist-card" onclick={() => activeTab = 'library'}>
							<div class="playlist-art" style:background={playlist.color}>
								<svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
							</div>
							<span class="playlist-name">{playlist.name}</span>
							<span class="playlist-count">{playlist.songCount} songs</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.music-app {
		height: 100%;
		display: flex;
		background: var(--win-surface);
	}

	.music-sidebar {
		width: 200px;
		border-right: 1px solid rgba(0, 0, 0, 0.06);
		padding: 16px 8px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		flex-shrink: 0;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 12px;
		color: var(--win-accent);
	}

	.app-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--win-text-primary);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		font-size: 13px;
		color: var(--win-text-primary);
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
	}

	.nav-item:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.nav-item.active {
		background: rgba(0, 120, 212, 0.08);
		color: var(--win-accent);
	}

	.music-main {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	/* Now Playing */
	.now-playing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		max-width: 400px;
		margin: 0 auto;
	}

	.album-art {
		width: 200px;
		height: 200px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.song-info {
		text-align: center;
	}

	.song-title {
		display: block;
		font-size: 18px;
		font-weight: 600;
		color: var(--win-text-primary);
	}

	.song-artist {
		display: block;
		font-size: 14px;
		color: var(--win-text-secondary);
		margin-top: 2px;
	}

	.song-album {
		display: block;
		font-size: 12px;
		color: var(--win-text-secondary);
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 2px;
		cursor: pointer;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--win-accent);
		border-radius: 2px;
		transition: width 0.3s linear;
	}

	.time-labels {
		width: 100%;
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--win-text-secondary);
		margin-top: -8px;
	}

	.playback-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.control-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: var(--win-text-primary);
		transition: all 0.08s ease;
		position: relative;
	}

	.control-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.control-btn.small {
		width: 32px;
		height: 32px;
		color: var(--win-text-secondary);
	}

	.control-btn.small.active {
		color: var(--win-accent);
	}

	.control-btn.play {
		width: 48px;
		height: 48px;
		background: var(--win-accent);
		color: white;
	}

	.control-btn.play:hover {
		opacity: 0.9;
		background: var(--win-accent);
	}

	.repeat-indicator {
		position: absolute;
		bottom: 2px;
		right: 2px;
		font-size: 8px;
		font-weight: 700;
	}

	.volume-control {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		color: var(--win-text-secondary);
	}

	.volume-slider {
		flex: 1;
		accent-color: var(--win-accent);
	}

	.volume-value {
		font-size: 11px;
		min-width: 24px;
		color: var(--win-text-secondary);
	}

	.up-next {
		width: 100%;
		margin-top: 8px;
	}

	.up-next-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--win-text-primary);
		margin-bottom: 8px;
	}

	.up-next-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		width: 100%;
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
		text-align: left;
	}

	.up-next-item:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.mini-art {
		width: 36px;
		height: 36px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.up-next-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.up-next-name {
		font-size: 13px;
		color: var(--win-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.up-next-artist {
		font-size: 11px;
		color: var(--win-text-secondary);
	}

	.up-next-duration {
		font-size: 12px;
		color: var(--win-text-secondary);
	}

	/* Library */
	.library-view, .playlists-view {
		width: 100%;
	}

	.view-title {
		font-size: 22px;
		font-weight: 600;
		color: var(--win-text-primary);
		margin-bottom: 16px;
	}

	.library-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 10px;
		font-size: 11px;
		font-weight: 600;
		color: var(--win-text-secondary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		text-transform: uppercase;
	}

	.library-list {
		display: flex;
		flex-direction: column;
	}

	.library-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 10px;
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
		text-align: left;
		width: 100%;
	}

	.library-item:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.library-item.active {
		background: rgba(0, 120, 212, 0.06);
	}

	.lib-col {
		font-size: 13px;
		color: var(--win-text-primary);
	}

	.lib-num {
		width: 24px;
		text-align: center;
		color: var(--win-text-secondary);
		flex-shrink: 0;
	}

	.title-col {
		flex: 2;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.lib-song-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.lib-song-title {
		font-size: 13px;
		color: var(--win-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lib-song-artist {
		font-size: 11px;
		color: var(--win-text-secondary);
	}

	.lib-album {
		flex: 1;
		color: var(--win-text-secondary);
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.duration-col {
		width: 50px;
		text-align: right;
		flex-shrink: 0;
	}

	.lib-duration {
		font-size: 12px;
		color: var(--win-text-secondary);
	}

	/* Playlists */
	.playlists-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 16px;
	}

	.playlist-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border-radius: var(--win-radius-sm);
		transition: background-color 0.08s ease;
		text-align: left;
	}

	.playlist-card:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.playlist-art {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.playlist-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--win-text-primary);
	}

	.playlist-count {
		font-size: 11px;
		color: var(--win-text-secondary);
	}
</style>
