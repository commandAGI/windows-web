import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	compilerOptions: {
		cssHash: ({ hash, css }) => `w-${hash(css)}`,
	},
};
