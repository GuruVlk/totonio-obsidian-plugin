// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Viewer } from '../src/viewer';
import { loadDocument } from '../src/document';
import { sampleJson } from './fixture';
import { interpolateView } from '../src/viewTween';
import type { View } from '../src/core/types';
import { contentBounds, fitBounds } from '../src/presentation';

let viewer: Viewer;
let now = 0;
let nextId = 0;
let width = 900;
let reduced = false;
let motion: EventTarget;
const callbacks = new Map<number, FrameRequestCallback>();
const targetTransform = (view: View) => `translate(${view.x} ${view.y}) scale(${view.zoom})`;
const scene = () => viewer.root.querySelector('.totonio-svg > g')!;
const click = (label: string) => viewer.root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
const advance = (time: number) => {
  now = time;
  const pending = [...callbacks.values()];
  callbacks.clear();
  for (const callback of pending) callback(time);
};

beforeEach(() => {
  now = 0; width = 900; reduced = false; nextId = 0;
  callbacks.clear();
  motion = new EventTarget();
  Object.defineProperty(motion, 'matches', { get: () => reduced });
  vi.stubGlobal('matchMedia', () => motion);
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.set(++nextId, callback); return nextId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { callbacks.delete(id); });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width, height: 560, x: 0, y: 0, left: 0, top: 0, right: width, bottom: 560, toJSON: () => ({}) }));
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const state = loadDocument(sampleJson, 'sample.totonio');
  state.shapes.find((shape) => shape.id === 'frame-2')!.width = 450;
  state.shapes.find((shape) => shape.id === 'frame-2')!.height = 260;
  viewer = new Viewer(container, state);
});

afterEach(() => {
  viewer.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('starts fitted and glides for exactly 840 ms without replacing scene nodes', () => {
  expect(callbacks.size).toBe(0);
  const from = { ...viewer.presentation.view };
  const image = scene().querySelector('image');
  const label = scene().querySelector('text');
  click('Next frame');
  const to = { ...viewer.presentation.view };
  expect(to.zoom).not.toBe(from.zoom);
  expect(scene().getAttribute('transform')).toBe(targetTransform(from));
  advance(210);
  expect(scene().getAttribute('transform')).toBe(targetTransform(interpolateView(from, to, 0.25)));
  advance(420);
  expect(scene().getAttribute('transform')).toBe(targetTransform(interpolateView(from, to, 0.5)));
  advance(839);
  expect(scene().getAttribute('transform')).not.toBe(targetTransform(to));
  advance(840);
  expect(scene().getAttribute('transform')).toBe(targetTransform(to));
  expect(scene().querySelector('image')).toBe(image);
  expect(scene().querySelector('text')).toBe(label);
  expect(callbacks.size).toBe(0);
});

it('redirects rapid navigation from the displayed camera and cancels the old callback', () => {
  const from = { ...viewer.presentation.view };
  click('Next frame');
  const firstTarget = { ...viewer.presentation.view };
  advance(210);
  const midway = interpolateView(from, firstTarget, 0.25);
  click('Previous frame');
  expect(callbacks.size).toBe(1);
  expect(scene().getAttribute('transform')).toBe(targetTransform(midway));
  advance(630);
  expect(scene().getAttribute('transform')).toBe(targetTransform(interpolateView(midway, from, 0.5)));
  advance(1050);
  expect(scene().getAttribute('transform')).toBe(targetTransform(from));
});

it('Escape restores the parked free view and cannot be overwritten by a late tick', () => {
  click('Next frame');
  advance(210);
  viewer.root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(callbacks.size).toBe(0);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.savedView));
  advance(1000);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.savedView));
  expect(viewer.root.querySelector<SVGElement>('.totonio-frame-dim')!.style.display).toBe('none');
  click('Start frames');
  expect(callbacks.size).toBe(1);
});

it('unchanged resize notifications preserve glide; real pane resize refits immediately', () => {
  click('Next frame');
  advance(210);
  const transform = scene().getAttribute('transform');
  viewer.resize();
  expect(scene().getAttribute('transform')).toBe(transform);
  expect(callbacks.size).toBe(1);
  width = 360;
  viewer.resize();
  expect(callbacks.size).toBe(0);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.view));
  advance(1000);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.view));
});

it('supports instant transitions and live reduced-motion changes', () => {
  click('Next frame');
  advance(210);
  click('Glide between frames');
  expect(callbacks.size).toBe(0);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.view));
  click('Previous frame');
  expect(callbacks.size).toBe(0);
  click('Glide between frames');
  click('Next frame');
  expect(callbacks.size).toBe(1);
  reduced = true;
  motion.dispatchEvent(new Event('change'));
  expect(callbacks.size).toBe(0);
  const toggle = viewer.root.querySelector<HTMLButtonElement>('[aria-label="Glide between frames"]')!;
  expect(toggle.disabled).toBe(true);
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  click('Previous frame');
  expect(callbacks.size).toBe(0);
  expect(scene().getAttribute('transform')).toBe(targetTransform(viewer.presentation.view));
});

it('cleans up callbacks and media listeners when the viewer closes', () => {
  click('Next frame');
  expect(callbacks.size).toBe(1);
  viewer.dispose();
  expect(callbacks.size).toBe(0);
  advance(1000);
  reduced = true;
  motion.dispatchEvent(new Event('change'));
  expect(document.querySelector('.totonio-viewer')).toBeNull();
  expect(callbacks.size).toBe(0);
});

it('turns the dim around the active frame off and on without leaving frame view', () => {
  const dim = viewer.root.querySelector<SVGElement>('.totonio-frame-dim')!;
  const toggle = viewer.root.querySelector<HTMLButtonElement>('[aria-label="Dim the canvas around the active frame"]')!;
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  click('Next frame');
  expect(dim.style.display).toBe('');
  click('Dim the canvas around the active frame');
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(dim.style.display).toBe('none');
  click('Next frame');
  expect(viewer.presentation.activeFrame).toBeTruthy();
  expect(dim.style.display).toBe('none');
  click('Dim the canvas around the active frame');
  expect(dim.style.display).toBe('');
});

it('keeps static previews and frameless documents free of animation controls', () => {
  viewer.dispose();
  const state = loadDocument(sampleJson, 'sample.totonio');
  viewer = new Viewer(document.body, state, { preview: true });
  expect(viewer.root.querySelector('.totonio-toolbar')).toBeNull();
  expect(callbacks.size).toBe(0);
  viewer.dispose();
  state.shapes = state.shapes.filter((shape) => shape.type !== 'frame');
  viewer = new Viewer(document.body, state);
  expect(viewer.root.querySelector('[aria-label="Glide between frames"]')).toBeNull();
  expect(viewer.root.querySelector('[aria-label="Dim the canvas around the active frame"]')).toBeNull();
  expect(callbacks.size).toBe(0);
  expect(scene().getAttribute('transform')).toBe(targetTransform(fitBounds(contentBounds(state.shapes)!, { width, height: 560 })));
});

it('fits frameless content once, preserves manual navigation on resize, and resets to saved view', () => {
  viewer.dispose();
  const state = loadDocument(sampleJson, 'sample.totonio');
  state.shapes = state.shapes.filter((shape) => shape.type !== 'frame');
  const original = JSON.stringify(state);
  viewer = new Viewer(document.body, state);
  const fitted = { ...viewer.presentation.view };
  click('Fit content');
  expect(viewer.presentation.view).toEqual(fitted);
  viewer.presentation.pan({ x: 80, y: 40 });
  const panned = { ...viewer.presentation.view };
  width = 450;
  viewer.resize();
  expect(viewer.presentation.view).toEqual(panned);
  click('Reset view');
  expect(viewer.presentation.view).toEqual(state.view);
  viewer.resize();
  expect(viewer.presentation.view).toEqual(state.view);
  expect(JSON.stringify(state)).toBe(original);
});

it('defers initial fit until a hidden pane has a usable size', () => {
  viewer.dispose();
  const state = loadDocument(sampleJson, 'sample.totonio');
  state.shapes = state.shapes.filter((shape) => shape.type !== 'frame');
  width = 0;
  viewer = new Viewer(document.body, state);
  expect(viewer.presentation.view).toEqual(state.view);
  width = 600;
  viewer.resize();
  expect(viewer.presentation.view).toEqual(fitBounds(contentBounds(state.shapes)!, { width, height: 560 }));
});

it.each([-100, 100])('doubles trackpad pinch sensitivity at delta %s while keeping wheel zoom and anchor unchanged', (deltaY) => {
  click('Free view');
  const saved = { ...viewer.presentation.view };
  const point = { x: 240, y: 180 };
  const surface = viewer.root.querySelector('.totonio-surface')!;
  surface.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: point.x, clientY: point.y, cancelable: true }));
  const wheelZoom = viewer.presentation.view.zoom;
  expect(wheelZoom).toBeCloseTo(saved.zoom * Math.exp(-deltaY * 0.002));
  click('Reset view');
  surface.dispatchEvent(new WheelEvent('wheel', { deltaY, ctrlKey: true, clientX: point.x, clientY: point.y, cancelable: true }));
  const pinch = viewer.presentation.view;
  expect(pinch.zoom).toBeCloseTo(saved.zoom * (wheelZoom / saved.zoom) ** 2);
  expect((point.x - pinch.x) / pinch.zoom).toBeCloseTo((point.x - saved.x) / saved.zoom);
  expect((point.y - pinch.y) / pinch.zoom).toBeCloseTo((point.y - saved.y) / saved.zoom);
});