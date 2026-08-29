import { defineConfig } from 'vitest/config';
import 'dotenv/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        testTimeout: 30000,
        env: {
            DATABASE_URL:
                process.env.DATABASE_URL ||
                'postgresql://postgres:postgres@localhost:5432/sentinel_test?sslmode=disable',
        },
    },
});
