/** System preferences for the Windows 11 simulation. */

export const preferences = $state({
	theme: 'dark' as 'light' | 'dark',
	accentColor: '#0078d4',
	wallpaper: 'bloom' as string,
	transparency: true,
	animations: true,
	volume: 68,
	brightness: 80,
	nightLight: false,
	wifi: true,
	bluetooth: false,
	airplaneMode: false,
	batterySaver: false,
});

/**
 * Apply current preferences to the document. Call this from an $effect in App.svelte.
 */
export function applyPreferences(): void {
	const root = document.documentElement;

	// Theme
	root.classList.toggle('light-theme', preferences.theme === 'light');
	root.classList.toggle('dark-theme', preferences.theme === 'dark');

	// Accent color
	root.style.setProperty('--win-accent', preferences.accentColor);
	// Compute a lighter variant for hover states
	root.style.setProperty('--win-accent-light', preferences.accentColor + 'cc');

	// Transparency
	root.classList.toggle('no-transparency', !preferences.transparency);

	// Animations
	root.classList.toggle('no-animations', !preferences.animations);
}
