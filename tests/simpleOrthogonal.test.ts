import { describe, expect, it } from 'vitest';
import { connectorPathPoints, connectorPoints, roundedRoutePoints } from '../src/core/geometry';
import { connectorRouteGeometry } from '../src/core/connectorRouting';
import type { CanvasShape, Point } from '../src/core/types';

const box = (id: string, x: number, y: number): CanvasShape => ({ id, type: 'rect', x, y, width: 100, height: 100, parentId: null, color: '#123456' });
const free = (x: number, y: number) => ({ type: 'free' as const, x, y });
const attached = (shapeId: string, position: number) => ({ type: 'shape' as const, shapeId, position });
const line = (patch: Partial<CanvasShape> = {}): CanvasShape => ({ ...box('line', 0, 0), type: 'line',
  start: free(0, 0), end: free(200, 100), routeStyle: 'simple-orthogonal', cornerStyle: 'sharp', ...patch });
const route = (connector: CanvasShape, shapes: CanvasShape[] = []) => connectorPathPoints(connector, [...shapes, connector]);

describe('simple orthogonal routes', () => {
  it.each([
    ['fake', 42.22], ['test', 37.6], ['programs', 93.18], ['popcorn', 82.66],
  ] as const)('matches the web label gap for %s', (label, expectedGap) => {
    const geometry = connectorRouteGeometry([{ x: 0, y: 0 }, { x: 400, y: 0 }], 'none', 4, label, 20);
    expect(geometry.shaftParts).toHaveLength(2);
    expect(geometry.shaftParts[1].start.x - geometry.shaftParts[0].end.x).toBeCloseTo(expectedGap);
  });
  it('matches the tight web gap on vertical routes', () => {
    const geometry = connectorRouteGeometry([{ x: 0, y: 0 }, { x: 0, y: 400 }], 'none', 4, 'test', 20);
    expect(geometry.shaftParts[1].start.y - geometry.shaftParts[0].end.y).toBeCloseTo(28);
  });
  it.each([
    [free(200, 100), [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }]],
    [free(100, 200), [{ x: 0, y: 0 }, { x: 0, y: 200 }, { x: 100, y: 200 }]],
    [free(100, 100), [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]],
    [free(0, 100), [{ x: 0, y: 0 }, { x: 0, y: 100 }]],
  ])('chooses the first free axis by displacement %#', (end, expected) => {
    expect(route(line({ end: end as ReturnType<typeof free> }))).toEqual(expected);
  });
  it('sets each leg off across the direction the previous one arrived from, as the web app does', () => {
    // Two L-shaped legs: both arrive vertically, so both following legs set off horizontally.
    const connector = line({ routePoints: [{ x: 50, y: 30 }, { x: 80, y: 60 }] });
    expect(route(connector)).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 },
      { x: 80, y: 30 }, { x: 80, y: 60 }, { x: 200, y: 60 }, { x: 200, y: 100 }]);
    // A straight leg flips the axis; a zero-length one counts as horizontal.
    expect(route(line({ routePoints: [{ x: 50, y: 0 }] }))).toEqual([
      { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 200, y: 100 },
    ]);
    expect(route(line({ routePoints: [{ x: 0, y: 0 }] }))).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 200, y: 100 },
    ]);
  });
  it.each([
    [0, 0.5, 300, 200, 'horizontal'],
    [0.5, 0, -300, 200, 'horizontal'],
    [0.25, 0.75, 200, 300, 'vertical'],
    [0.75, 0.25, 200, -300, 'vertical'],
  ] as const)('centers facing rails %#', (startPosition, endPosition, x, y, axis) => {
    const shapes = [box('start', 0, 0), box('end', x, y)];
    const connector = line({ start: attached('start', startPosition), end: attached('end', endPosition) });
    const { start, end } = connectorPoints(connector, shapes);
    const expected: Point[] = axis === 'horizontal'
      ? [start, { x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }, end]
      : [start, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, end];
    expect(route(connector, shapes)).toEqual(expected);
    expect(route({ ...connector, cornerStyle: 'rounded' }, shapes)).toEqual(roundedRoutePoints(expected, 12));
  });
  it('collapses aligned facing ends and ignores obstacles', () => {
    const shapes = [box('start', 0, 0), box('end', 300, 0)];
    const connector = line({ start: attached('start', 0), end: attached('end', 0.5) });
    const { start, end } = connectorPoints(connector, shapes);
    expect(route(connector, shapes)).toEqual([start, end]);
    expect(route({ ...connector, routeOffset: 800 }, [...shapes, box('obstacle', 150, 0)])).toEqual([start, end]);
  });
  it('slides a facing rail by routeOffset and stops short of either border', () => {
    const shapes = [box('start', 0, 0), box('end', 300, 200)];
    const connector = line({ start: attached('start', 0), end: attached('end', 0.5) });
    const { start, end } = connectorPoints(connector, shapes);
    const railX = (offset: number) => route({ ...connector, routeOffset: offset }, shapes)[1].x;
    expect(railX(30)).toBe((start.x + end.x) / 2 + 30);
    expect(railX(-30)).toBe((start.x + end.x) / 2 - 30);
    // The clearance keeps a 12-unit leg on each side, so 800 is clamped to 100 - 12 either way.
    expect(railX(800)).toBe(end.x - 12);
    expect(railX(-800)).toBe(start.x + 12);
  });
  it('treats a point far along the bottom of a wide box as leaving downward', () => {
    const wide: CanvasShape = { ...box('wide', 0, 0), width: 200, height: 60 };
    const below = box('below', 400, 300);
    // Normalized border position 0.133 lands on the bottom edge close to its right corner.
    const connector = line({ start: attached('wide', 0.133), end: attached('below', 0.75) });
    const { start } = connectorPoints(connector, [wide, below]);
    const path = route(connector, [wide, below]);
    expect(start.y).toBeCloseTo(60);
    expect(start.x).toBeGreaterThan(180);
    expect(path[1]).toEqual({ x: start.x, y: path[1].y });
    expect(path[1].y).toBeGreaterThan(start.y);
  });
  it('pulls the second leg of a single-bend route clear of the corner by routeOffset', () => {
    // Leaves the first box to the right and enters the second from the top: one corner at (350, 50).
    const shapes = [box('start', 0, 0), box('end', 300, 300)];
    const connector = line({ start: attached('start', 0), end: attached('end', 0.75) });
    const { start, end } = connectorPoints(connector, shapes);
    expect(route(connector, shapes)).toEqual([start, { x: end.x, y: start.y }, end]);
    // Same expectations as the web app's geometry test for this layout.
    expect(route({ ...connector, routeOffset: -80 }, shapes)).toEqual([start, { x: end.x - 80, y: start.y }, { x: end.x - 80, y: end.y }, end]);
    // A leftover offset does nothing once the ends line up.
    const level = [box('start', 0, 0), box('end', 300, 0)];
    const straight = line({ start: attached('start', 0), end: attached('end', 0.5), routeOffset: -80 });
    expect(route(straight, level)).toHaveLength(2);
  });
  it('uses start side and opposite end-side axes for single attachments', () => {
    const shapes = [box('box', 0, 0)];
    const connector = line({ start: attached('box', 0.25), end: free(250, 250) });
    const { start, end } = connectorPoints(connector, shapes);
    expect(route(connector, shapes)).toEqual([start, { x: start.x, y: end.y }, { x: end.x, y: end.y }]);
    const reversed = line({ start: free(end.x, end.y), end: attached('box', 0.25) });
    const resolved = connectorPoints(reversed, shapes);
    expect(route(reversed, shapes)).toEqual([{ x: resolved.start.x, y: resolved.start.y }, { x: resolved.end.x, y: resolved.start.y }, resolved.end]);
  });
  it('manual waypoints bypass facing rails', () => {
    const shapes = [box('start', 0, 0), box('end', 300, 200)];
    const connector = line({ start: attached('start', 0), end: attached('end', 0.5), routePoints: [{ x: 150, y: 150 }] });
    const { start, end } = connectorPoints(connector, shapes);
    // The first leg arrives vertically at the bend, so the second sets off horizontally again.
    expect(route(connector, shapes)).toEqual([start, { x: 150, y: start.y }, { x: 150, y: 150 }, { x: end.x, y: 150 }, end]);
  });
  it('non-facing and backward-facing pairs use one corner with no clearance stubs', () => {
    const shapes = [box('start', 0, 0), box('end', -300, 200)];
    for (const endPosition of [0, 0.5]) {
      const connector = line({ start: attached('start', 0), end: attached('end', endPosition) });
      const { start, end } = connectorPoints(connector, shapes);
      expect(route(connector, shapes)).toEqual([start, { x: end.x, y: start.y }, end]);
    }
  });
  it('treats line attachments as non-border endpoints', () => {
    const target = line({ id: 'target', start: free(0, 0), end: free(0, 100), routeStyle: 'straight' });
    const connector = line({ start: attached('target', 0.5), end: free(200, 150) });
    expect(route(connector, [target])).toEqual([{ x: 0, y: 50 }, { x: 200, y: 50 }, { x: 200, y: 150 }]);
  });
  it('collapses a nearly aligned facing pair within the specified tolerance', () => {
    const shapes = [box('start', 0, 0), box('end', 300, 0.0005)];
    const connector = line({ start: attached('start', 0), end: attached('end', 0.5) });
    const { start, end } = connectorPoints(connector, shapes);
    expect(route(connector, shapes)).toEqual([start, end]);
  });
  it('handles zero length, plain lines, and rounding without mutating source data', () => {
    expect(route(line({ end: free(0, 0) }))).toEqual([{ x: 0, y: 0 }]);
    const connector = line({ type: 'plain-line', cornerStyle: 'rounded', routeOffset: -300 });
    const before = JSON.stringify(connector);
    expect(route(connector)).toEqual(roundedRoutePoints([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }], 12));
    expect(JSON.stringify(connector)).toBe(before);
  });
});