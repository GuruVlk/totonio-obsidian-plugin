import type { CanvasShape, ShapeType } from '../src/core/types';

export const embeddedSvg = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect width="96" height="64" rx="6" fill="#d8ece6"/><path d="M12 48L32 24L50 40L66 18L84 48Z" fill="#287562"/><circle cx="20" cy="16" r="6" fill="#e5a93d"/></svg>');
export const embeddedPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=';

const shape = (id: string, type: ShapeType, x: number, y: number, width: number, height: number, extra: Partial<CanvasShape> = {}): CanvasShape => ({
  id, type, x, y, width, height, parentId: null, color: '#287562', fill: '#ffffff', labelSize: 'extra-small', ...extra,
});
export const sampleShapes: CanvasShape[] = [
  shape('frame-2', 'frame', 960, 0, 900, 520, { frameOrder: 1, label: 'Services' }),
  shape('frame-1', 'frame', 0, 0, 900, 520, { frameOrder: 0, label: 'System overview' }),
  shape('title', 'text', 24, 12, 650, 46, { label: 'Totonio / System overview', labelSize: 'medium', labelBold: true, fill: 'transparent' }),
  shape('group', 'group', 24, 86, 550, 232),
  shape('container', 'panel', 24, 86, 540, 232, { parentId: 'group', label: 'Workspace', labelSize: 'small', labelBold: true, headerFill: '#d8ece6', iconData: embeddedSvg, iconSize: 24 }),
  shape('start', 'rect', 48, 168, 128, 80, { parentId: 'container', label: 'Vault', labelSize: 'small', iconData: embeddedSvg, iconCorner: 'bottom-right', iconSize: 20 }),
  shape('decision', 'decision', 228, 150, 120, 116, { parentId: 'container', label: 'v3?', fill: '#fff1c9', color: '#a07820', cornerStyle: 'sharp' }),
  shape('image', 'image', 416, 166, 112, 78, { parentId: 'container', imageData: embeddedSvg, label: 'Embedded image' }),
  shape('route-1', 'line', 0, 0, 0, 0, { parentId: 'container', color: '#287562', start: { type: 'shape', shapeId: 'start', position: 0 }, end: { type: 'shape', shapeId: 'decision', position: 0.5 }, arrowDirection: 'end', label: 'read', routeStyle: 'orthogonal' }),
  shape('route-2', 'line', 0, 0, 0, 0, { parentId: 'container', color: '#a07820', start: { type: 'shape', shapeId: 'decision', position: 0 }, end: { type: 'shape', shapeId: 'image', position: 0.5 }, arrowDirection: 'end', label: 'render', routeStyle: 'curved' }),
  shape('notes', 'panel', 600, 86, 270, 232, { label: 'Presentation', labelSize: 'small', labelBold: true, color: '#5576a6', headerFill: '#e5ecf6', body: '**Native rendering**\n- Shapes and hierarchy\n- Routed connectors\n- Embedded assets', bodyWrap: true, bodySize: 'small' }),
  shape('cloud', 'cloud', 32, 354, 146, 106, { label: 'Cloud', fill: '#e5ecf6', color: '#5576a6' }),
  shape('database', 'database', 210, 348, 90, 112, { label: 'Data', fill: '#d8ece6' }),
  shape('person', 'person', 342, 352, 76, 96, { label: 'Viewer', color: '#ba6558', fill: '#fae4df' }),
  shape('firewall', 'firewall', 458, 352, 76, 92, { label: 'Offline', color: '#ba6558', fill: '#fae4df' }),
  shape('legend', 'legend', 602, 342, 268, 148, { label: 'Components', labelSize: 'small', labelBold: true, legendItems: [
    { id: 'legend-1', icon: 'rect', label: 'Vault content', fill: '#d8ece6', color: '#287562' },
    { id: 'legend-2', icon: 'database2', label: 'Embedded data', fill: '#e5ecf6', color: '#5576a6' },
    { id: 'legend-3', icon: 'plain-line', label: 'Read-only flow', fill: 'transparent', color: '#ba6558', borderStyle: 'dotted' },
  ] }),
  shape('second-title', 'text', 988, 20, 600, 46, { label: 'Totonio / Services', labelSize: 'medium', labelBold: true }),
  shape('brackets', 'brackets', 990, 100, 310, 270, { label: 'Container', labelVerticalAlign: 'top', fill: '#eef6f3' }),
  shape('circle', 'circle', 1050, 176, 140, 140, { parentId: 'brackets', label: 'Service', fill: '#e5ecf6', color: '#5576a6' }),
  shape('arrow', 'arrow', 1360, 180, 140, 90, { label: 'Flow', fill: '#fff1c9', color: '#a07820', rotation: -15 }),
  shape('database-icon', 'database2', 1610, 144, 144, 174, { label: 'Store', fill: '#d8ece6' }),
  shape('plain-line', 'plain-line', 1000, 415, 700, 0, { start: { type: 'free', x: 1000, y: 415 }, end: { type: 'free', x: 1730, y: 415 }, label: 'Local data only', arrowDirection: 'both', borderStyle: 'double' }),
];

export const sampleDocument = {
  format: 'totonio', version: 3,
  assets: [{ id: 'preview', data: embeddedSvg }, { id: 'pixel', data: embeddedPng }],
  shapes: sampleShapes.map((entry) => {
    const { imageData, iconData, ...rest } = entry;
    return { ...rest, ...(imageData ? { imageAssetId: 'preview' } : {}), ...(iconData ? { iconAssetId: 'preview' } : {}) };
  }),
  viewport: { x: 38, y: 54, zoom: 0.72 }, settings: { gridEnabled: true },
};
export const sampleJson = JSON.stringify(sampleDocument);