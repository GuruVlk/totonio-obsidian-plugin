import { describe, expect, it } from 'vitest';
import { Presentation, fitBounds } from '../src/presentation';
import type { CanvasShape, CanvasState } from '../src/core/types';

const frame = (id: string, frameOrder: number): CanvasShape => ({
  id, type: 'frame', frameOrder, x: 100, y: 200, width: 640, height: 360, parentId: null, color: '#123456',
});
const document: CanvasState = { shapes: [], view: { x: 45, y: -67, zoom: 1.4 }, showGrid: true };
const size = { width: 800, height: 600 };

describe('presentation navigation', () => {
  it('starts at the first ordered frame, with stable ties', () => {
    const state = new Presentation({ ...document, shapes: [frame('last', 4), frame('first', 0), frame('tie', 0)] }, size);
    expect(state.frames.map((shape) => shape.id)).toEqual(['first', 'tie', 'last']);
    expect(state.activeFrame?.id).toBe('first');
    expect(state.view).toEqual(fitBounds({ left: 100, top: 200, right: 740, bottom: 560 }, size));
    state.step(1);
    expect(state.activeFrame?.id).toBe('tie');
    state.step(-1);
    state.step(-1);
    expect(state.activeFrame?.id).toBe('last');
    state.step(1);
    expect(state.activeFrame?.id).toBe('first');
  });
  it('fits large frames and narrow panes without a minimum zoom clipping them', () => {
    const view = fitBounds({ left: -10000, top: -10000, right: 10000, bottom: 10000 }, { width: 320, height: 200 });
    expect(view.zoom * 20000).toBeLessThanOrEqual(136);
    expect(view.x).toBe(160);
    expect(view.y).toBe(100);
  });
  it('restores saved viewport without frames, including on resize', () => {
    const state = new Presentation(document, size);
    state.resize({ width: 300, height: 200 });
    state.step(1);
    expect(state.frameIndex).toBeNull();
    expect(state.view).toEqual(document.view);
  });
  it('refits active frames on resize and returns to the parked free view', () => {
    const state = new Presentation({ ...document, shapes: [frame('first', 0)] }, size);
    const previousZoom = state.view.zoom;
    state.pan({ x: 100, y: 200 });
    expect(state.view.zoom).toBe(previousZoom);
    state.resize({ width: 300, height: 200 });
    expect(state.view.zoom).toBeLessThan(previousZoom);
    state.escape();
    expect(state.view).toEqual(document.view);
    state.pan({ x: 10, y: 20 });
    const parked = { ...state.view };
    state.step(1);
    state.escape();
    expect(state.view).toEqual(parked);
  });
  it('zooms around the pointer and never mutates document state', () => {
    const original = JSON.stringify(document);
    const state = new Presentation(document, size);
    const world = { x: (100 - state.view.x) / state.view.zoom, y: (120 - state.view.y) / state.view.zoom };
    state.zoomAt({ x: 100, y: 120 }, 2);
    expect((100 - state.view.x) / state.view.zoom).toBeCloseTo(world.x);
    expect((120 - state.view.y) / state.view.zoom).toBeCloseTo(world.y);
    state.reset();
    expect(state.view).toEqual(document.view);
    state.fitContent();
    expect(state.view).toEqual(document.view);
    expect(JSON.stringify(document)).toBe(original);
  });
});