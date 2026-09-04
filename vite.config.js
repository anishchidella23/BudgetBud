import { defineConfig } from 'vite';

export default defineConfig({
    // Served from https://<user>.github.io/BudgetBud/ in production.
    base: process.env.GITHUB_ACTIONS ? '/BudgetBud/' : '/',
    build: { outDir: 'dist' },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
    },
});
