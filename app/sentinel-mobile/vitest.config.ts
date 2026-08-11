import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@sentinel/shared': path.resolve(__dirname, '../../packages/shared/src'),
        },
    },
    define: {
        __DEV__: 'true',
    },
    test: {
        environment: 'node',
    },
});
