// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Viewer } from '../src/viewer';
import { emptyTagFilter } from '../src/core/tags';
import type { CanvasShape, CanvasState } from '../src/core/types';

const box = (id: string, tags?: string[], parentId: string | null = null): CanvasShape => ({
  id, type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#123456', parentId, tags, label: id,
});
const state: CanvasState = { view: { x: 0, y: 0, zoom: 1 }, showGrid: false, shapes: [
  box('parent', ['Current State']), box('child', undefined, 'parent'), { ...box('peer', ['current state']), x: 400 }, box('future', ['Future State']),
  { ...box('bridge'), type: 'line', start: { type: 'shape', shapeId: 'parent' }, end: { type: 'shape', shapeId: 'peer' }, arrowDirection: 'end' },
  { ...box('frame'), type: 'frame', frameOrder: 0 },
] };
const viewers: Viewer[] = [];
const create = (document = state, preview = false) => {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const viewer = new Viewer(container, document, { preview });
  viewers.push(viewer);
  return viewer;
};
const toggle = (viewer: Viewer, name: string, checked: boolean) => {
  const input = viewer.root.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`)!;
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};
const faded = (viewer: Viewer, id: string) => viewer.root.querySelector(`[data-shape-id="${id}"]`)!.classList.contains('totonio-filtered-out');
afterEach(() => { viewers.splice(0).forEach((viewer) => viewer.dispose()); document.body.replaceChildren(); });

describe('tag filter viewer integration', () => {
  it('fades objects, connector shafts/arrows and separate labels together without rebuilding', () => {
    const viewer = create();
    const before = JSON.stringify(state);
    const node = viewer.root.querySelector('[data-shape-id="future"]');
    toggle(viewer, 'Tag: Current State', true);
    expect(faded(viewer, 'future')).toBe(true);
    expect(faded(viewer, 'child')).toBe(false);
    expect(faded(viewer, 'bridge')).toBe(false);
    const bridgeOption = viewer.root.querySelector<HTMLInputElement>('.totonio-tag-options label:last-child input')!;
    bridgeOption.click();
    expect(faded(viewer, 'bridge')).toBe(true);
    expect(viewer.root.querySelector('[data-label-for="bridge"]')!.classList.contains('totonio-filtered-out')).toBe(true);
    expect(viewer.root.querySelector('.totonio-arrowhead')!.closest('.totonio-filtered-out')).not.toBeNull();
    viewer.resize();
    expect(viewer.root.querySelector('[data-shape-id="future"]')).toBe(node);
    expect(faded(viewer, 'future')).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('keeps tabs independent, supports multiple tags, and clears to defaults', () => {
    const first = create();
    const second = create();
    toggle(first, 'Tag: Current State', true);
    toggle(first, 'Tag: Future State', true);
    expect(faded(first, 'future')).toBe(false);
    expect(second.tagFilter).toEqual(emptyTagFilter());
    const snapshot = first.tagFilter!;
    snapshot.tags.push('not real');
    expect(first.tagFilter!.tags).not.toContain('not real');
    first.root.querySelector<HTMLButtonElement>('[aria-label="Clear tag filter"]')!.click();
    expect(first.tagFilter).toEqual(emptyTagFilter());
    expect(first.root.querySelectorAll('.totonio-filtered-out')).toHaveLength(0);
  });
  it('closes the menu before Escape exits presentation and scopes other navigation keys', () => {
    const viewer = create();
    const button = viewer.root.querySelector<HTMLButtonElement>('[aria-label="Filter by tag"]')!;
    button.click();
    const panel = viewer.root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(panel.hidden).toBe(false);
    const before = viewer.presentation.view;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(viewer.presentation.view).toBe(before);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(viewer.presentation.frameIndex).toBe(0);
    expect(document.activeElement).toBe(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(viewer.presentation.frameIndex).toBeNull();
  });
  it('supports tagless/empty documents and keeps previews unfiltered', () => {
    const empty = create({ ...state, shapes: [] });
    expect(empty.root.textContent).toContain('This document has no objects.');
    const tagless = create({ ...state, shapes: [box('plain')] });
    expect(tagless.root.textContent).toContain('This document has no tags.');
    toggle(tagless, 'Untagged objects', true);
    expect(faded(tagless, 'plain')).toBe(false);
    const preview = create(state, true);
    expect(preview.root.querySelector('[aria-label="Filter by tag"]')).toBeNull();
    expect(preview.root.querySelector('.totonio-filtered-out')).toBeNull();
  });
  it('removes document-level handlers when disposed', () => {
    const viewer = create();
    const button = viewer.root.querySelector<HTMLButtonElement>('[aria-label="Filter by tag"]')!;
    button.click();
    viewer.dispose();
    button.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.totonio-tag-panel')).toBeNull();
  });
});