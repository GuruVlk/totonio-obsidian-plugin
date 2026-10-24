// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderDiagram, svgElement } from '../src/render';
import { connectorPathPoints } from '../src/core/geometry';
import { panelLayout, shapeLabelLayoutLines } from '../src/core/appearance';
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
  it.each(['straight', 'simple-orthogonal', 'orthogonal', 'curved'] as const)('renders %s routes with labels and both arrowheads', (routeStyle) => {
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
  it.each(['rounded', 'sharp'] as const)('draws an unlabelled simple route as one open %s path', (cornerStyle) => {
    const svg = render([{ ...connector, start: { type: 'free', x: 0, y: 0 }, end: { type: 'free', x: 200, y: 100 },
      routeStyle: 'simple-orthogonal', cornerStyle, label: undefined, arrowDirection: 'none' }]);
    const paths = svg.querySelectorAll('.totonio-connector');
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('fill')).toBe('none');
    expect(paths[0].getAttribute('d')).not.toMatch(/[zZ]/);
    expect(paths[0].getAttribute('stroke-linejoin')).toBe(cornerStyle === 'sharp' ? 'miter' : 'round');
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
  it('paints coloured Markdown words in their own colour', () => {
    const svg = render([{ ...box, type: 'text', labelAlign: 'left',
      label: '- <span style="color:#B63F34">**Tooling:** rigid</span> and <span style="color:red">plain</span>' }]);
    const spans = [...svg.querySelectorAll('tspan')].map((span) => [span.textContent, span.getAttribute('fill'), span.getAttribute('font-weight')]);
    expect(spans).toEqual([
      ['\u2022 ', '#b63f34', null], ['Tooling:', '#b63f34', '700'], [' rigid', '#b63f34', null],
      [' and <span style="color:red">plain</span>', null, null],
    ]);
  });
  it('colours a list marker like the start of its item', () => {
    const [blue, plain, bold] = shapeLabelLayoutLines({ ...box, type: 'text', width: 400, height: 200, labelSize: 'small',
      label: '- [ ] <span style="color:#5375d6">Blue</span> item\n- Plain <span style="color:#5375d6">tail</span>\n- <span style="color:#ef6351">**Bold**</span>' });
    // A plain glyph merges into the coloured run it introduces.
    expect(blue.runs[0]).toEqual({ text: '\u2610 Blue', color: '#5375d6' });
    expect(plain.runs[0].color).toBeUndefined();
    expect(bold.runs[0]).toEqual({ text: '\u2022 ', color: '#ef6351' });
  });
  it('sits list items one level in from the prose around them', () => {
    const lines = shapeLabelLayoutLines({ ...box, type: 'text', width: 400, height: 200,
      label: 'Plan\n- One\n- [ ] Todo\n- [x] Done\n  - Nested', labelSize: 'small', labelWrap: true });
    expect(lines.map((line) => line.text)).toEqual(['Plan', '\u2022 One', '\u2610 Todo', '\u2611 Done', '\u2022 Nested']);
    expect(lines[0].indent).toBe(0);
    expect(lines[1].indent).toBeGreaterThan(0);
    expect(lines[2].indent).toBe(lines[1].indent);
    expect(lines[4].indent).toBeGreaterThan(lines[1].indent);
    const body = panelLayout({ ...box, type: 'panel', width: 220, height: 260, label: 'Server',
      body: '- A list item long enough to wrap onto a second line', bodySize: 'small', bodyWrap: true }).bodyLayoutLines;
    expect(body.length).toBeGreaterThan(1);
    expect(body[0].indent).toBeGreaterThan(0);
    expect(body[1].indent).toBeGreaterThan(body[0].indent);
  });
  it('indents list items in every left-aligned label', () => {
    const xs = (svg: Element) => [...svg.querySelectorAll('tspan[x]')].map((span) => [span.textContent, Number(span.getAttribute('x'))] as const);
    const rect = xs(render([{ ...box, width: 420, height: 260, fill: '#ffffff', labelAlign: 'left', labelSize: 'small',
      label: '### Heading\n- [ ] First\n    - [ ] Nested' }]));
    expect(rect.map(([text]) => text)).toEqual(['Heading', '\u2610 First', '\u2610 Nested']);
    expect(rect[1][1]).toBeGreaterThan(rect[0][1]);
    expect(rect[2][1]).toBeGreaterThan(rect[1][1]);
    const text = xs(render([{ ...box, type: 'text', width: 400, height: 200, labelAlign: 'left', label: 'Plan\n- One' }]));
    expect(text.map(([value]) => value)).toEqual(['Plan', '\u2022 One']);
    expect(text[1][1]).toBeGreaterThan(text[0][1]);
    const justified = xs(render([{ ...box, width: 420, height: 260, labelAlign: 'justify', labelSize: 'small',
      label: 'Plan\n- [ ] First\n    - [ ] Nested' }]));
    expect(justified[1][1]).toBeGreaterThan(justified[0][1]);
    expect(justified[2][1]).toBeGreaterThan(justified[1][1]);
  });
  it('omits frame outlines and includes overflow children in content fit', () => {
    const shapes: CanvasShape[] = [box, { ...box, id: 'child', parentId: 'box', x: 500 }, { ...box, id: 'frame', type: 'frame', frameOrder: 0, x: 10000 }];
    expect(render(shapes).querySelector('[data-shape-type="frame"]')).toBeNull();
    expect(contentBounds(shapes)?.right).toBe(604);
  });
});