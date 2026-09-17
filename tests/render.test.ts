// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDiagram, svgElement } from '../src/render';
import { connectorPathPoints } from '../src/core/geometry';
import { contentBounds } from '../src/presentation';
import type { CanvasShape, ShapeType } from '../src/core/types';

const box: CanvasShape = { id: 'box', type: 'rect', x: 10, y: 20, width: 100, height: 80, parentId: null, color: '#123456' };
const render = (shapes: CanvasShape[]) => {
  const svg = svgElement(document.body, 'svg');
  const group = svgElement(svg, 'g');
  renderDiagram(group, shapes, 1);
  return group;
};
const connector: CanvasShape = { ...box, id: 'connector', type: 'line', start: { type: 'shape', shapeId: 'box', position: 0 },
  end: { type: 'free', x: 400, y: 200 }, arrowDirection: 'both', label: 'Connect', routeStyle: 'orthogonal' };

describe('native SVG rendering', () => {
  it('incremental zoom preserves nodes and matches a fresh render including corners', () => {
    const shapes: CanvasShape[] = [box, { ...box, id: 'panel', type: 'panel', headerFill: '#abcdef', body: 'Text' },
      { ...box, id: 'diamond', type: 'decision' }, { ...box, id: 'sharp', cornerStyle: 'sharp' },
      { ...box, id: 'legend', type: 'legend' }, { ...box, id: 'brackets', type: 'brackets' }];
    const svg = svgElement(document.body, 'svg');
    const group = svgElement(svg, 'g');
    const fresh = svgElement(svg, 'g');
    const updateZoom = renderDiagram(group, shapes, 1);
    const original = group.querySelector('[data-shape-id="panel"]');
    for (const zoom of [0.3, 2, 1.4]) {
      updateZoom(zoom);
      renderDiagram(fresh, shapes, zoom);
      expect(group.innerHTML).toBe(fresh.innerHTML);
      expect(group.querySelector('[data-shape-id="panel"]')).toBe(original);
    }
  });
  it('paints parents before children with absolute coordinates and invisible groups', () => {
    const svg = render([{ ...box, id: 'child', parentId: 'box', x: 40 }, box, { ...box, id: 'group', type: 'group' }]);
    expect([...svg.querySelectorAll('[data-shape-id]')].map((element) => element.getAttribute('data-shape-id'))).toEqual(['box', 'child']);
    expect(svg.querySelector('[data-shape-id="child"] rect')?.getAttribute('x')).toBe('40');
  });
  it.each<ShapeType>(['rect', 'brackets', 'arrow', 'circle', 'decision', 'cloud', 'person', 'panel', 'database', 'database2', 'firewall', 'legend', 'image', 'text'])('renders %s with finite geometry and escaped labels', (type) => {
    const svg = render([{ ...box, type, label: '<script>alert(1)</script>', body: '**Body**', imageData: 'data:image/png;base64,aGVsbG8=',
      legendItems: [{ id: 'item', icon: 'cloud', label: 'Cloud', color: '#123456', fill: '#ffffff' }] }]);
    expect(svg.querySelector('[data-shape-id]')).not.toBeNull();
    expect(svg.querySelector('text')?.textContent).toBeTruthy();
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it.each(['straight', 'orthogonal', 'curved'] as const)('renders %s routes with labels and both arrowheads', (routeStyle) => {
    const shapes = [box, { ...connector, routeStyle, routePoints: [{ x: 250, y: 50 }] }];
    const svg = render(shapes);
    expect(svg.querySelectorAll('.totonio-arrowhead')).toHaveLength(2);
    expect(svg.querySelector('.totonio-connector')?.getAttribute('fill')).toBe('none');
    expect(svg.querySelector('.totonio-connector-label')?.textContent).toBe('Connect');
    expect(connectorPathPoints(shapes[1], shapes).length).toBeGreaterThan(2);
  });
  it('renders double borders and arrow direction styles', () => {
    const svg = render([box, { ...connector, borderStyle: 'double', arrowDirection: 'start', labelRotation: 30 }]);
    expect(svg.querySelectorAll('.totonio-arrowhead')).toHaveLength(1);
    expect(svg.querySelector('.totonio-connector-label')?.getAttribute('transform')).toContain('rotate(30');
  });
  it('renders images and corner icons only as isolated image elements', () => {
    const data = 'data:image/svg+xml;base64,PHN2Zy8+';
    const svg = render([{ ...box, iconData: data, iconCorner: 'bottom-right', iconSize: 24 }, { ...box, id: 'image', type: 'image', imageData: data }]);
    expect(svg.querySelectorAll('image')).toHaveLength(2);
    expect(svg.querySelector('.totonio-corner-icon')?.getAttribute('href')).toBe(data);
    expect(svg.querySelector('foreignObject, iframe, script, a')).toBeNull();
  });
  it('preserves fills, corners, rotation, Markdown and panel typography', () => {
    const svg = render([{ ...box, type: 'panel', cornerStyle: 'sharp', fill: '#ffffff', headerFill: '#eeeeee',
      rotation: 15, label: '**Header**', body: '*Body*', bodyColor: '#ff0000', bodyUnderline: true }]);
    expect(svg.querySelector('rect')?.getAttribute('rx')).toBe('0');
    expect(svg.querySelector('[data-shape-id]')?.getAttribute('transform')).toContain('rotate(15');
    expect(svg.querySelector('tspan[font-style="italic"]')?.textContent).toBe('Body');
    expect(svg.querySelector('tspan[font-weight="700"]')?.textContent).toBe('Header');
  });
  it('omits frame outlines and includes overflow children in content fit', () => {
    const shapes: CanvasShape[] = [box, { ...box, id: 'child', parentId: 'box', x: 500 }, { ...box, id: 'frame', type: 'frame', frameOrder: 0, x: 10000 }];
    expect(render(shapes).querySelector('[data-shape-type="frame"]')).toBeNull();
    expect(contentBounds(shapes)?.right).toBe(604);
  });
});