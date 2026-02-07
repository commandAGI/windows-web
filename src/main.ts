import { mount } from 'svelte';
import App from './App.svelte';
import './css/global.css';
import { initEmbedBridge } from './lib/embed-bridge';

const app = mount(App, {
	target: document.getElementById('root')!,
});

// Initialise the postMessage bridge so the CommandAGI parent frame can
// communicate with this simulation (screenshots, heartbeats, etc.).
initEmbedBridge();

export default app;
