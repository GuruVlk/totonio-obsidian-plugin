import { describe, expect, it } from 'vitest';
import { CANVAS_BACKGROUND } from '../src/core/colors';
import { exportSvg } from '../src/core/export';
import type { CanvasShape } from '../src/core/types';
import { pngScale } from '../src/copy';

// Cases and expected markup mirror the web app's src/canvas/export.test.ts for whole-diagram exports.
const shapes: CanvasShape[] = [
  { id: 'parent', type: 'rect', x: 0, y: 0, width: 200, height: 120, parentId: null, color: '#123456', fill: '#ffffff', label: 'A&B' },
  { id: 'child', type: 'circle', x: 30, y: 40, width: 40, height: 40, parentId: 'parent', color: '#abcdef' },
  { id: 'sibling', type: 'rect', x: 100, y: 40, width: 40, height: 40, parentId: 'parent', color: '#999999' },
  { id: 'peer', type: 'rect', x: 260, y: 20, width: 80, height: 60, parentId: null, color: '#654321' },
  { id: 'between', type: 'line', x: 0, y: 0, width: 0, height: 0, parentId: null, color: '#333333', arrowDirection: 'end', label: 'HTTPS', labelPosition: 0.75, labelRotation: 15, labelColor: '#aa0000', start: { type: 'shape', shapeId: 'child' }, end: { type: 'shape', shapeId: 'peer' } },
  { id: 'free', type: 'line', x: 0, y: 0, width: 0, height: 0, parentId: null, color: '#444444', start: { type: 'shape', shapeId: 'child' }, end: { type: 'free', x: 180, y: 100 } },
];

describe('whole-diagram SVG export', () => {
  it('exports styled SVG with escaped labels and connector geometry', () => {
    const result = exportSvg(shapes)!;

    expect(result.width).toBeGreaterThan(300);
    expect(result.svg).toContain('A&amp;B');
    expect(result.svg).toContain('<ellipse');
    expect(result.svg).toContain('<line');
    expect(result.svg).toContain('<path d="M 260 51.6');
    expect(result.svg).toContain('fill="#aa0000"');
    expect(result.svg).toContain('transform="rotate(15 ');
    expect(result.svg).toContain('>HTTPS</tspan></text>');
    expect(result.svg).not.toContain('data-shape-id');
  });

  it('exports a rotated Decision as its diamond path instead of a rectangle', () => {
    const decision: CanvasShape = { id: 'decision', type: 'decision', x: 20, y: 30, width: 120, height: 80, rotation: 30, parentId: null, color: '#123456', fill: '#ffffff', cornerStyle: 'sharp' };
    const svg = exportSvg([decision], null)!.svg;

    expect(svg).toContain('<g transform="rotate(30 80 70)"><path d="M 80 30 L 140 70 L 80 110 L 20 70 Z"');
    expect(svg).not.toContain('<rect');
    expect(exportSvg([decision], null)!.width).toBeCloseTo(167.923);
    expect(exportSvg([decision], null)!.height).toBeCloseTo(153.282);
  });

  it('exports multiline connector labels as centered text rows', () => {
    const connector: CanvasShape = { ...shapes[4], label: 'HTTPS\nTLS' };
    const svg = exportSvg([shapes[1], shapes[3], connector])!.svg;

    expect(svg).toContain('>HTTPS</tspan><tspan');
    expect(svg).toContain('dy="38.4">TLS</tspan>');
  });

  it('omits presentation frames', () => {
    const frame: CanvasShape = { id: 'frame', type: 'frame', label: 'Overview', x: -20, y: -20, width: 400, height: 240, frameOrder: 0, parentId: null, color: '#5375d6' };

    expect(exportSvg([...shapes, frame])?.svg).not.toContain('Overview');
    expect(exportSvg([...shapes, frame])).toEqual(exportSvg(shapes));
  });

  it('exports a double line as two parallel strokes', () => {
    const line: CanvasShape = { id: 'double', type: 'plain-line', x: 10, y: 20, width: 100, height: 0, parentId: null, color: '#333333', borderStyle: 'double', strokeWidth: 2, start: { type: 'free', x: 10, y: 20 }, end: { type: 'free', x: 110, y: 20 } };
    const svg = exportSvg([line])!.svg;

    expect(svg).toContain('<line x1="10" y1="22" x2="110" y2="22"');
    expect(svg).toContain('<line x1="10" y1="18" x2="110" y2="18"');
    expect(svg.match(/<line /g)).toHaveLength(2);
  });

  it('exports routed, curved and dashed orthogonal connectors as paths', () => {
    const routed: CanvasShape = { id: 'routed', type: 'line', x: 0, y: 0, width: 0, height: 0, parentId: null, color: '#123456',
      start: { type: 'free', x: 0, y: 0 }, end: { type: 'free', x: 100, y: 100 }, routePoints: [{ x: 100, y: 0 }], arrowDirection: 'end' };
    const orthogonal: CanvasShape = { id: 'orthogonal', type: 'line', x: 0, y: 0, width: 0, height: 0, parentId: null, color: '#123456', routeStyle: 'orthogonal', borderStyle: 'dashed',
      start: { type: 'free', x: 0, y: 0 }, end: { type: 'free', x: 100, y: 100 } };

    expect(exportSvg([routed])!.svg).toContain('<path d="M 0 0 L ');
    expect(exportSvg([routed])!.svg).toContain('M 100 100');
    expect(exportSvg([{ ...routed, routeStyle: 'curved', arrowDirection: undefined }])!.svg).toContain('stroke-linejoin="round"');
    const svg = exportSvg([orthogonal])!.svg;
    expect(svg.match(/<path d="M /g)).toHaveLength(1);
    expect(svg).toContain('stroke-dasharray=');
    expect(svg).not.toContain('<line ');
  });

  it('exports embedded images, image labels and corner icons', () => {
    const image: CanvasShape = { id: 'image', type: 'image', x: 20, y: 30, width: 160, height: 80, parentId: null, color: 'transparent', imageData: 'data:image/png;base64,iVBORw0KGgo=', label: 'System diagram', labelColor: '#123456', labelSize: 'medium' };
    const rect: CanvasShape = { id: 'vpc', type: 'rect', x: 0, y: 0, width: 200, height: 120, parentId: null, color: '#2f7d6d', iconData: 'data:image/svg+xml;base64,PHN2Zy8+', iconCorner: 'bottom-right', iconSize: 50 };
    const exported = exportSvg([image])!;

    expect(exported.svg).toContain('<image x="20" y="30" width="160" height="80"');
    expect(exported.svg).toContain('<text x="100" y="141.04" text-anchor="middle"');
    expect(exported.height).toBeGreaterThan(104);
    expect(exportSvg([{ ...image, label: undefined, rotation: 15 }])!.svg).toContain('<image transform="rotate(15 100 70)"');
    expect(exportSvg([rect])!.svg).toContain('<image x="142" y="62" width="50" height="50" href="data:image/svg+xml;base64,PHN2Zy8+" preserveAspectRatio="xMidYMid meet" />');
  });

  it('paints the canvas surface by default and omits it when transparent', () => {
    expect(exportSvg(shapes)?.svg).toContain(`fill="${CANVAS_BACKGROUND}"`);
    expect(exportSvg(shapes, null)!.svg).not.toContain('class="export-background"');
  });

  it('exports inline emphasis and bounds-derived text sizes', () => {
    const text: CanvasShape = { id: 'text', type: 'text', x: 0, y: 0, width: 400, height: 40, parentId: null, color: 'transparent', label: 'plain **bold** and `code`', labelSize: 'small' };
    const scaled: CanvasShape = { id: 'scaled', type: 'text', x: 0, y: 0, width: 300, height: 100, parentId: null, color: 'transparent', label: 'Text', labelColor: '#252421', labelSize: 'small', scaleTextWithBounds: true };
    const svg = exportSvg([text])!.svg;

    expect(svg).not.toContain('**');
    expect(svg).toContain('<tspan font-weight="700">bold</tspan>');
    expect(svg).toContain('font-family="SFMono-Regular, Consolas, monospace">code</tspan>');
    expect(svg).toContain('<tspan x="200" dy="0">plain </tspan>');
    expect(exportSvg([scaled])?.svg).toContain('font-size="71.42857142857143"');
  });

  it('exports shape-specific geometry like the web app', () => {
    const cloud: CanvasShape = { id: 'cloud', type: 'cloud', x: 0, y: 0, width: 176, height: 136, parentId: null, color: '#dcc0ba', fill: '#ffffff' };
    const arrow: CanvasShape = { id: 'arrow', type: 'arrow', x: 0, y: 0, width: 100, height: 60, parentId: null, color: '#5375d6', fill: '#ffffff' };
    const panel: CanvasShape = { id: 'panel', type: 'panel', x: 20, y: 30, width: 260, height: 180, parentId: null, color: '#2f7d6d', fill: '#ffffff', strokeWidth: 2, label: 'Server Name', headerFill: '#eef2d0' };
    const database: CanvasShape = { id: 'database', type: 'database', x: 20, y: 30, width: 100, height: 120, parentId: null, color: '#5375d6', fill: '#ffffff', strokeWidth: 2, label: 'Primary DB' };
    const firewall: CanvasShape = { id: 'firewall', type: 'firewall', x: 20, y: 30, width: 64, height: 75, parentId: null, color: '#9d422c', fill: '#f7bb08', strokeWidth: 2, label: 'Firewall', labelSize: 'small' };

    expect(exportSvg([cloud])!.svg).toContain('<path d="M 32.81 102.21 A');
    expect(exportSvg([arrow])!.svg).toContain('M 0 16.8 L 70 16.8 L 70 0 L 100 30 L 70 60 L 70 43.2 L 0 43.2 Z');
    expect(exportSvg([panel])!.svg).toContain('<path d="M 25 30 H 275 Q 280 30 280 35 V');
    expect(exportSvg([database])!.svg).toContain('<ellipse cx="70" cy="42.5" rx="50" ry="12.5" fill="#ffffff"');
    expect(exportSvg([firewall])!.svg).toContain('scale(3.333)');
    expect(exportSvg([firewall])!.svg).toContain('stroke-width="0.6"');
  });

  it('exports Legend rows with their icon colors and S-size text', () => {
    const legend: CanvasShape = { id: 'legend', type: 'legend', x: 20, y: 30, width: 184, height: 122, parentId: null, color: '#2f7d6d', fill: '#ffffff', label: 'Legend', separatorColor: '#123456', separatorStyle: 'dotted', separatorWidth: 4, legendItems: [
      { id: 'row-1', icon: 'firewall', label: 'Postgres & cache', color: '#d43c32', fill: '#f4c7c3', borderStyle: 'dashed' },
      { id: 'row-2', icon: 'plain-line', label: 'Dotted line', color: '#5375d6', fill: 'transparent', borderStyle: 'dotted' },
    ] };
    const svg = exportSvg([legend])!.svg;

    expect(svg).toContain('Postgres &amp; cache');
    expect(svg).toContain('font-size="10"');
    expect(svg).toContain('stroke="#123456" stroke-width="4" stroke-dasharray="4 10"');
    expect(svg.match(/<circle c[xy]="(?:4|12|20)"/g)).toHaveLength(3);
  });

  it('returns nothing for a diagram without visible objects', () => {
    expect(exportSvg([])).toBeNull();
    expect(exportSvg([{ id: 'g', type: 'group', x: 0, y: 0, width: 10, height: 10, parentId: null, color: '#000000' }])).toBeNull();
  });
});

describe('PNG scale', () => {
  it('doubles small diagrams and caps large ones by edge and by pixel count', () => {
    expect(pngScale(400, 300)).toBe(2);
    expect(pngScale(10000, 100)).toBeCloseTo(0.8192);
    const scale = pngScale(4000, 3000);
    expect(4000 * scale * 3000 * scale).toBeLessThanOrEqual(16_777_216 + 1);
  });
});
