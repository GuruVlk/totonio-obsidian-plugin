import { expect, it } from 'vitest';
import { easeInOutCubic, interpolateView, VIEW_TWEEN_MS } from '../src/viewTween';

it('uses Totonio\'s exact 840 ms cubic easing and geometric zoom', () => {
  expect(VIEW_TWEEN_MS).toBe(840);
  expect([-1, 0, 0.25, 0.5, 0.75, 1, 2].map(easeInOutCubic))
    .toEqual([0, 0, 0.0625, 0.5, 0.9375, 1, 1]);
  const from = { x: 20, y: -100, zoom: 0.25 };
  const to = { x: -300, y: 60, zoom: 4 };
  expect(interpolateView(from, to, 0)).toEqual(from);
  expect(interpolateView(from, to, 0.5)).toEqual({ x: -140, y: -20, zoom: 1 });
  expect(interpolateView(from, to, 1)).toEqual(to);
  expect(interpolateView(from, to, 0.25).zoom).toBeCloseTo(0.25 * 16 ** 0.0625);
  expect(from).toEqual({ x: 20, y: -100, zoom: 0.25 });
  expect(to).toEqual({ x: -300, y: 60, zoom: 4 });
});