import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const json = (path: string) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

it('uses consistent release metadata and a directory-compliant plugin ID', () => {
  const manifest = json('manifest.json');
  expect(manifest.id).toBe('totonio-presentation');
  expect(manifest.id).not.toContain('obsidian');
  expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(manifest.version).toBe(json('package.json').version);
  expect(json('versions.json')[manifest.version]).toBe(manifest.minAppVersion);
  expect(manifest.description.length).toBeLessThanOrEqual(250);
  expect(manifest.description).toMatch(/\.$/);
  expect(manifest.author).toBe('GuruVlk');
  expect(manifest.fundingUrl).toBe('https://www.buymeacoffee.com/vladimirplk');
  expect(json('package.json').license).toBe('MIT');
});