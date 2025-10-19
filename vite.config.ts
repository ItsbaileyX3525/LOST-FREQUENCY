import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	root: "frontend",
	build: {
		outDir: "../public",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'frontend/index.html'),
				404: resolve(__dirname, 'frontend/404.html'),
				page: resolve(__dirname, 'frontend/main.html'),
				terms: resolve(__dirname, 'frontend/terms.html')
			}
		}
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
