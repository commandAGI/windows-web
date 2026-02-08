import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { browserslistToTargets } from 'lightningcss';
import browserslist from 'browserslist';

export default defineConfig({
	base: './',
	plugins: [svelte()],
	resolve: {
		alias: {
			'~': new URL('./src/', import.meta.url).pathname,
		},
	},
	build: {
		minify: 'terser',
		cssMinify: 'lightningcss',
	},
	css: {
		transformer: 'lightningcss',
		lightningcss: {
			targets: browserslistToTargets(browserslist('defaults, not IE 11, not IE_Mob 11, not dead')),
		},
	},
	preview: {
		port: 4200,
	},
});
