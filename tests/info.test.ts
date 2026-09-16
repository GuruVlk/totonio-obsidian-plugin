// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderInfo, SUPPORT_URL } from '../src/info';

it('renders the plugin information, local artwork, and explicit support link', () => {
  const container = document.createElement('div');
  renderInfo(container, '0.1.0');
  expect(container.querySelector('h1, h2, h3')).toBeNull();
  expect(container.querySelector('.setting-item-heading')?.textContent).toBe('Made for viewing');
  expect(container.querySelector('.totonio-info-header')?.textContent).toContain('Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.');
  expect(container.textContent).toContain('Version 0.1.0');
  expect(container.textContent).toContain('By GuruVlk');
  expect(container.textContent).toContain('Made by GuruVlk.');
  expect(container.textContent).not.toContain('Vladimir Plojhar');
  expect(container.textContent).toContain('read-only');
  expect(container.querySelectorAll('img')).toHaveLength(2);
  expect(container.querySelector('.totonio-info-diagram img')?.getAttribute('src')).toContain('diagram-view.png');
  expect(container.querySelector('.totonio-info-diagram img')?.getAttribute('alt')).toContain('Read-only Totonio plugin diagram view');
  expect(container.querySelector('img[src*="hint-"]')).toBeNull();
  expect(container.textContent).not.toContain('Editing controls pictured');
  for (const image of container.querySelectorAll('img')) {
    expect(image.alt).not.toBe('');
    expect(image.getAttribute('src')).not.toMatch(/^https?:/);
  }
  const link = container.querySelector<HTMLAnchorElement>('.totonio-coffee-link')!;
  expect(link.href).toBe(SUPPORT_URL);
  expect(link.rel).toBe('noopener noreferrer');
  expect(container.querySelector('iframe, script, input')).toBeNull();
  expect(container.querySelector('pre code')?.textContent).toContain('path/to/diagram.totonio');
  renderInfo(container, '0.2.0');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.textContent).toContain('Version 0.2.0');
});

it('distinguishes web authoring capabilities from read-only plugin features', () => {
  const container = document.createElement('div');
  renderInfo(container, '0.1.0');
  const web = container.querySelector('.totonio-info-web')!;
  expect(web.textContent).toContain('not to the read-only Obsidian plugin');
  expect(web.textContent).toContain('Web presentations');
  expect(web.textContent).toContain('Object tags');
  expect(web.textContent).toContain('does not provide tag filtering');
  expect(web.textContent).toContain('PlantUML and Mermaid');
  expect(web.textContent).toContain('supports a subset');
  expect(web.textContent).toContain('does not import scripts');
  expect(web.querySelector('a')?.href).toBe('https://totonio.pages.dev/');
  expect(container.textContent).toContain('does not send your diagram or its path');
});