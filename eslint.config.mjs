import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['node_modules/**', 'main.js', '.test-build/**', 'test-results/**', 'playwright-report/**', 'tests/**', 'scripts/**', '*.mjs', 'vitest.config.ts'] },
  ...obsidianmd.configs.recommended,
  { files: ['playwright.config.ts'], languageOptions: { globals: { process: 'readonly' } } },
  {
    files: ['src/**/*.ts', 'playwright.config.ts'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { 'obsidianmd/ui/sentence-case': ['warn', { brands: ['Totonio', 'GuruVlk', 'PlantUML', 'Mermaid'], acronyms: ['JSON', 'SVG', 'API', 'PNG', 'JPEG', 'WebP', 'GIF', 'URL'] }] },
  },
]);