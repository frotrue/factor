import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
    plugins: [preact()],
    build: {
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser'],
                    preact: ['preact', '@preact/signals']
                }
            }
        }
    }
});
