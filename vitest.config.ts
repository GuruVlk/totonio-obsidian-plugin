import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [{
    name: 'obsidian-test-host',
    resolveId(id) { return id === 'obsidian' ? '\0obsidian' : null; },
    load(id) { return id === '\0obsidian' ? 'export {}' : null; },
  }],
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/e2e/**'] },
});