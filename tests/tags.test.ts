import { describe, expect, it } from 'vitest';
import { canvasTags, emptyTagFilter, reconcileTagFilter, tagFilterMatchIds, untaggedCount } from '../src/core/tags';
import type { CanvasShape } from '../src/core/types';

const box = (id: string, tags?: string[], parentId: string | null = null): CanvasShape => ({
  id, type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#123456', parentId, tags,
});
const shapes: CanvasShape[] = [
  box('container', ['Current State']), box('child', undefined, 'container'), box('grandchild', ['Other'], 'child'),
  box('peer', ['current state']), box('future', ['Future State']),
  { ...box('bridge'), type: 'line', start: { type: 'shape', shapeId: 'container' }, end: { type: 'shape', shapeId: 'peer' } },
  { ...box('tagged-link', ['Other']), type: 'line', start: { type: 'shape', shapeId: 'container' }, end: { type: 'shape', shapeId: 'peer' } },
  { ...box('free-link'), type: 'line', start: { type: 'free', x: 0, y: 0 }, end: { type: 'shape', shapeId: 'peer' } },
];

describe('read-only tag matching', () => {
  it('counts and sorts existing tags case-insensitively and counts untagged objects', () => {
    expect(canvasTags(shapes)).toEqual([{ tag: 'Current State', count: 2 }, { tag: 'Future State', count: 1 }, { tag: 'Other', count: 2 }]);
    expect(untaggedCount(shapes)).toBe(3);
    expect(tagFilterMatchIds(shapes, emptyTagFilter())).toBeNull();
  });
  it('includes descendants and untagged linking connectors by default, without mutation', () => {
    const before = JSON.stringify(shapes);
    expect(tagFilterMatchIds(shapes, { ...emptyTagFilter(), tags: ['CURRENT STATE'] }))
      .toEqual(new Set(['container', 'child', 'grandchild', 'peer', 'bridge']));
    expect(JSON.stringify(shapes)).toBe(before);
  });
  it('supports strict matching and OR selection', () => {
    expect(tagFilterMatchIds(shapes, { ...emptyTagFilter(), tags: ['current state', 'Future State'], inheritChildren: false, bridgeConnectors: false }))
      .toEqual(new Set(['container', 'peer', 'future']));
  });
  it('selects untagged objects without inheriting their tagged children', () => {
    expect(tagFilterMatchIds(shapes, { ...emptyTagFilter(), untagged: true }))
      .toEqual(new Set(['child', 'bridge', 'free-link']));
    const matches = tagFilterMatchIds(shapes, { ...emptyTagFilter(), tags: ['current state'], untagged: true });
    expect(matches?.has('grandchild')).toBe(true);
    expect(matches?.has('tagged-link')).toBe(false);
  });
  it('preserves valid selections and drops removed tags after a document reload', () => {
    const filter = { ...emptyTagFilter(), tags: ['removed', 'CURRENT STATE'], untagged: true, inheritChildren: false };
    expect(reconcileTagFilter(shapes, filter)).toEqual({ ...filter, tags: ['CURRENT STATE'] });
    expect(reconcileTagFilter([], filter)).toEqual({ ...filter, tags: [], untagged: false });
    expect(filter.tags).toEqual(['removed', 'CURRENT STATE']);
  });
  it('handles groups, empty documents, and tagged frames without changing frame order', () => {
    const scene: CanvasShape[] = [{ ...box('group', ['Topic']), type: 'group' }, box('nested', undefined, 'group'),
      { ...box('frame', ['Topic']), type: 'frame', frameOrder: 7 }];
    expect(tagFilterMatchIds(scene, { ...emptyTagFilter(), tags: ['Topic'] })).toEqual(new Set(['group', 'nested', 'frame']));
    expect(scene[2].frameOrder).toBe(7);
    expect(tagFilterMatchIds([], { ...emptyTagFilter(), tags: ['Topic'] })).toEqual(new Set());
  });
});