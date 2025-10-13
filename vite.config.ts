import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	root: "frontend",
	build: {
		outDir: "../public",
		emptyOutDir: true
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/ws': {
				target: 'ws://localhost:3001',
				ws: true
			}
		}
	},
    plugins: [
        tailwindcss(),
    ]
});
