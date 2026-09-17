import { ArrowBigRight, Brackets, BrickWall, Circle, Cloud, Cylinder, Database, Diamond,
  Image, Minus, PanelTop, Square, Type, UserRound, Waypoints } from 'lucide';
import { bodyTextDecoration, CODE_FONT_FAMILY, databaseIconLayout, firewallLayout, labelFontSize,
  layoutSpans, legendLayout, panelLayout, personLayout, shapeIconLayout, shapeLabelLayout,
  shapeLabelLayoutLines, shapeLabelTextDecoration, strokeDasharray } from './core/appearance';
import { connectorRouteGeometry, routeSegmentPathData } from './core/connectorRouting';
import { connectorPathPoints, parallelSegments, shapesInPaintOrder } from './core/geometry';
import { arrowPathData, bracketsPathData, cloudPathData, cylinderMetrics, cylinderPathData,
  panelHeaderPathData, roundedDiamondPath } from './core/shapePaths';
import { getShapeDefinition } from './core/shapeRegistry';
import type { CanvasShape, LegendIconType } from './core/types';

const NS = 'http://www.w3.org/2000/svg';
type Attributes = Record<string, string | number | undefined>;
type Runs = ReturnType<typeof layoutSpans>;
type Lines = ReturnType<typeof shapeLabelLayoutLines>;
const icons = { rect: Square, brackets: Brackets, arrow: ArrowBigRight, circle: Circle, decision: Diamond,
  cloud: Cloud, person: UserRound, panel: PanelTop, database: Cylinder, database2: Database,
  firewall: BrickWall, image: Image, 'plain-line': Minus, line: Waypoints, text: Type };

export function svgElement<Tag extends keyof SVGElementTagNameMap>(parent: Element, tag: Tag, attributes: Attributes = {}): SVGElementTagNameMap[Tag] {
  const element = parent.ownerDocument.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) if (value !== undefined) element.setAttribute(name, String(value));
  parent.appendChild(element);
  return element;
}

function renderRuns(parent: Element, runs: Runs): void {
  for (const run of runs) {
    const span = svgElement(parent, 'tspan', {
      x: run.x, dy: run.dy, 'font-size': run.size, 'font-weight': run.bold ? 700 : undefined,
      'font-style': run.italic ? 'italic' : undefined, 'font-family': run.code ? CODE_FONT_FAMILY : undefined,
      'text-decoration': [run.strike ? 'line-through' : '', run.href ? 'underline' : ''].filter(Boolean).join(' ') || undefined,
    });
    span.textContent = run.text;
  }
}

function renderLines(parent: Element, lines: Lines, x: number, lineHeight: number, indented: boolean, size: number, justifyWidth?: number): void {
  if (justifyWidth === undefined) {
    renderRuns(parent, layoutSpans(lines, x, lineHeight, indented, size));
    return;
  }
  lines.forEach((line, index) => {
    const justify = !line.paragraphEnd && line.text.includes(' ');
    const span = svgElement(parent, 'tspan', {
      x: x + (justify || !indented ? 0 : line.indent), dy: index === 0 ? 0 : lineHeight,
      textLength: justify ? justifyWidth : undefined, lengthAdjust: justify ? 'spacing' : undefined,
    });
    renderRuns(span, line.runs.length ? line.runs : [{ text: ' ' }]);
  });
}

function renderLabel(parent: Element, shape: CanvasShape): void {
  if (!shape.label) return;
  const layout = shapeLabelLayout(shape);
  const text = svgElement(parent, 'text', {
    class: 'totonio-label', x: layout.x, y: layout.firstBaseline, 'text-anchor': layout.anchor,
    'dominant-baseline': layout.dominantBaseline, fill: shape.labelColor ?? '#252421',
    'font-size': layout.size, 'font-weight': shape.labelBold ? 700 : 400,
    'font-style': shape.labelItalic ? 'italic' : 'normal', 'text-decoration': shapeLabelTextDecoration(shape),
  });
  renderLines(text, shapeLabelLayoutLines(shape), layout.x, layout.lineHeight,
    shape.type === 'text' && layout.anchor === 'start', layout.size, layout.justifyWidth);
}

function renderIcon(parent: Element, shape: CanvasShape): void {
  const layout = shapeIconLayout(shape);
  if (layout) svgElement(parent, 'image', { class: 'totonio-corner-icon', href: shape.iconData,
    x: layout.x, y: layout.y, width: layout.size, height: layout.size, preserveAspectRatio: 'xMidYMid meet' });
}

function legendIcon(parent: Element, type: LegendIconType, attributes: Attributes): void {
  const icon = svgElement(parent, 'svg', { viewBox: '0 0 24 24', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attributes });
  for (const [tag, attrs] of icons[type]) svgElement(icon, tag as keyof SVGElementTagNameMap, attrs);
}

function renderLegend(parent: Element, shape: CanvasShape): void {
  const layout = legendLayout(shape);
  (shape.legendItems ?? []).forEach((item, index) => {
    const rowY = layout.contentTop + index * layout.rowHeight;
    if ((item.icon === 'database' || item.icon === 'database2') && item.fill !== 'transparent') {
      svgElement(parent, 'path', { transform: `translate(${shape.x + 10} ${rowY}) scale(${layout.iconSize / 24})`,
        d: 'M3 5 A9 3 0 0 1 21 5 V19 A9 3 0 0 1 3 19 Z', fill: item.fill });
    }
    const unfilled = ['database', 'database2', 'line', 'text'].includes(item.icon);
    if (item.icon === 'plain-line' && item.borderStyle === 'dotted') {
      for (const offset of [3, 9, 15]) svgElement(parent, 'circle', {
        cx: shape.x + 10 + offset, cy: rowY + layout.iconSize / 2, r: 1.5, fill: item.color,
      });
    } else {
      legendIcon(parent, item.icon, { x: shape.x + 10, y: rowY, width: layout.iconSize, height: layout.iconSize,
        stroke: item.color, fill: unfilled || item.fill === 'transparent' ? 'none' : item.fill,
        'stroke-width': 2, 'stroke-dasharray': strokeDasharray(item.borderStyle, 2) });
    }
    svgElement(parent, 'text', { class: 'totonio-label', x: shape.x + 36, y: rowY + layout.iconSize / 2,
      'dominant-baseline': 'central', fill: shape.labelColor ?? '#252421', 'font-size': 10,
      'font-weight': shape.labelBold ? 700 : 400, 'font-style': shape.labelItalic ? 'italic' : 'normal',
      'text-decoration': shapeLabelTextDecoration(shape) }).textContent = item.label;
  });
}

function renderPanelBody(parent: Element, shape: CanvasShape): void {
  if (!shape.body) return;
  const layout = panelLayout(shape);
  const text = svgElement(parent, 'text', { class: 'totonio-label', x: layout.bodyX, y: layout.bodyFirstBaseline,
    'text-anchor': layout.bodyAnchor, fill: shape.bodyColor ?? shape.labelColor ?? '#252421',
    'font-size': layout.bodySize, 'font-weight': shape.bodyBold ? 700 : 400,
    'font-style': shape.bodyItalic ? 'italic' : 'normal', 'text-decoration': bodyTextDecoration(shape) });
  renderLines(text, layout.bodyLayoutLines, layout.bodyX, layout.bodyLineHeight,
    layout.bodyAnchor === 'start', layout.bodySize, layout.bodyJustifyWidth);
}

function renderConnector(parent: Element, labelLayer: Element, shape: CanvasShape, shapes: CanvasShape[]): void {
  const strokeWidth = shape.strokeWidth ?? 2;
  const route = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection, strokeWidth,
    shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap);
  const parallel = route.shaftParts.map((part) => parallelSegments(part.start, part.end, strokeWidth));
  const parts = (shape.borderStyle === 'double'
    ? [...parallel.map((pair) => pair[0]), ...parallel.map((pair) => pair[1])] : route.shaftParts)
    .filter((part) => Math.hypot(part.end.x - part.start.x, part.end.y - part.start.y) > 0.001);
  for (const path of routeSegmentPathData(parts)) svgElement(parent, 'path', {
    class: 'totonio-connector', d: path, fill: 'none', stroke: shape.color, 'stroke-width': strokeWidth,
    'stroke-dasharray': strokeDasharray(shape.borderStyle, strokeWidth), 'stroke-linecap': 'butt',
    'stroke-linejoin': shape.cornerStyle === 'sharp' ? 'miter' : 'round',
  });
  for (const head of [route.startArrow, route.endArrow]) {
    if (head) svgElement(parent, 'path', { class: 'totonio-arrowhead',
      d: `M ${head.tip.x} ${head.tip.y} L ${head.left.x} ${head.left.y} L ${head.right.x} ${head.right.y} Z`, fill: shape.color });
  }
  const layout = route.labelLayout;
  if (!layout) return;
  const label = svgElement(labelLayer, 'text', { class: 'totonio-label totonio-connector-label',
    'data-label-for': shape.id, x: layout.center.x, y: layout.firstBaseline, 'text-anchor': 'middle',
    'dominant-baseline': 'central', fill: shape.labelColor ?? shape.color, 'font-size': labelFontSize(shape.labelSize),
    'font-weight': shape.labelBold ? 700 : 400, 'font-style': shape.labelItalic ? 'italic' : 'normal',
    'text-decoration': shapeLabelTextDecoration(shape),
    transform: layout.rotation ? `rotate(${layout.rotation} ${layout.center.x} ${layout.center.y})` : undefined,
  });
  layout.lines.forEach((line, index) => {
    svgElement(label, 'tspan', { x: layout.center.x, dy: index === 0 ? 0 : layout.lineHeight }).textContent = line || ' ';
  });
}

function renderShape(parent: Element, labels: Element, shape: CanvasShape, shapes: CanvasShape[], zoom: number, zoomUpdates: Array<(zoom: number) => void>): void {
  const geometry = getShapeDefinition(shape.type).geometry;
  if (geometry === 'frame' || geometry === 'group') return;
  const group = svgElement(parent, 'g', { 'data-shape-id': shape.id, 'data-shape-type': shape.type,
    'data-parent-id': shape.parentId ?? undefined,
    transform: shape.rotation && geometry !== 'connector'
      ? `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})` : undefined });
  const strokeWidth = shape.strokeWidth ?? 2;
  const fill = shape.fill === 'transparent' ? 'none' : shape.fill ?? 'rgba(255,255,255,0.72)';
  const common = { fill, stroke: shape.color, 'stroke-width': strokeWidth,
    'stroke-dasharray': strokeDasharray(shape.borderStyle, strokeWidth) };
  const radius = shape.cornerStyle === 'sharp' ? 0 : 5 / zoom;
  const rectangle = { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rx: radius };
  switch (geometry) {
    case 'connector':
      renderConnector(group, labels, shape, shapes);
      return;
    case 'image':
      svgElement(group, 'image', { href: shape.imageData, ...rectangle, preserveAspectRatio: 'none' });
      break;
    case 'ellipse':
      svgElement(group, 'ellipse', { ...common, cx: shape.x + shape.width / 2, cy: shape.y + shape.height / 2,
        rx: Math.abs(shape.width) / 2, ry: Math.abs(shape.height) / 2 });
      break;
    case 'diamond':
      svgElement(group, 'path', { ...common, d: roundedDiamondPath(shape, radius) });
      break;
    case 'cloud':
      svgElement(group, 'path', { ...common, d: cloudPathData(shape, strokeWidth) });
      break;
    case 'arrow':
      svgElement(group, 'path', { ...common, d: arrowPathData(shape), 'stroke-linejoin': 'round' });
      break;
    case 'brackets':
      svgElement(group, 'rect', { ...rectangle, rx: 0, fill, stroke: 'none' });
      svgElement(group, 'path', { ...common, d: bracketsPathData(shape), fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' });
      break;
    case 'person': {
      const { iconX, iconY, iconSize } = personLayout(shape);
      const attributes = { ...common, 'stroke-width': strokeWidth * 0.75 };
      svgElement(group, 'circle', { ...attributes, cx: iconX + iconSize / 2, cy: iconY + iconSize / 2, r: iconSize / 2 });
      svgElement(group, 'circle', { ...attributes, fill: 'none', cx: iconX + iconSize / 2, cy: iconY + iconSize * 0.375, r: iconSize * 0.125 });
      svgElement(group, 'path', { ...attributes, fill: 'none', 'stroke-linecap': 'round',
        d: `M ${iconX + iconSize * 0.25} ${iconY + iconSize * 0.83} C ${iconX + iconSize * 0.27} ${iconY + iconSize * 0.65}, ${iconX + iconSize * 0.73} ${iconY + iconSize * 0.65}, ${iconX + iconSize * 0.75} ${iconY + iconSize * 0.83}` });
      break;
    }
    case 'panel':
    case 'legend': {
      const layout = geometry === 'panel' ? panelLayout(shape) : legendLayout(shape);
      svgElement(group, 'rect', { ...common, ...rectangle });
      if (geometry === 'panel' && shape.headerFill) {
        svgElement(group, 'path', { d: panelHeaderPathData(shape, layout.dividerY, radius), fill: shape.headerFill === 'transparent' ? 'none' : shape.headerFill });
        svgElement(group, 'rect', { ...common, ...rectangle, fill: 'none' });
      }
      svgElement(group, 'line', { x1: shape.x, x2: shape.x + shape.width, y1: layout.dividerY, y2: layout.dividerY,
        stroke: shape.separatorColor ?? shape.color, 'stroke-width': shape.separatorWidth ?? strokeWidth,
        'stroke-dasharray': strokeDasharray(shape.separatorStyle ?? shape.borderStyle, shape.separatorWidth ?? strokeWidth) });
      if (geometry === 'panel') { renderIcon(group, shape); renderPanelBody(group, shape); }
      else renderLegend(group, shape);
      break;
    }
    case 'cylinder': {
      const metrics = cylinderMetrics(shape);
      svgElement(group, 'path', { ...common, d: cylinderPathData(shape) });
      svgElement(group, 'ellipse', { ...common, cx: metrics.centerX, cy: metrics.topCenterY, rx: metrics.radiusX, ry: metrics.radiusY });
      break;
    }
    case 'firewall': {
      const layout = firewallLayout(shape);
      const icon = svgElement(group, 'g', { ...common, transform: `translate(${layout.wallX} ${layout.wallY}) scale(${layout.scale})`,
        'stroke-width': strokeWidth / Math.max(layout.scale, 0.001), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      svgElement(icon, 'rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 });
      for (const path of ['M12 9v6', 'M16 15v6', 'M16 3v6', 'M3 15h18', 'M3 9h18', 'M8 15v6', 'M8 3v6']) {
        svgElement(icon, 'path', { d: path, fill: 'none' });
      }
      break;
    }
    case 'database-icon': {
      const layout = databaseIconLayout(shape);
      const icon = svgElement(group, 'g', { ...common, transform: `translate(${layout.iconX} ${layout.iconY}) scale(${layout.scale})`,
        'stroke-width': strokeWidth / Math.max(layout.scale, 0.001), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      svgElement(icon, 'path', { d: 'M3 5 A9 3 0 0 1 21 5 V19 A9 3 0 0 1 3 19 Z', fill, stroke: 'none' });
      svgElement(icon, 'ellipse', { cx: 12, cy: 5, rx: 9, ry: 3, fill: 'none' });
      svgElement(icon, 'path', { d: 'M3 5V19A9 3 0 0 0 21 19V5 M3 12A9 3 0 0 0 21 12', fill: 'none' });
      break;
    }
    case 'text':
      break;
    default:
      svgElement(group, 'rect', { ...common, ...rectangle });
      renderIcon(group, shape);
  }
  if (shape.cornerStyle !== 'sharp') {
    if (geometry === 'rectangle' || geometry === 'panel' || geometry === 'legend') {
      const rectangles = [...group.children].filter((child) => child.tagName === 'rect');
      for (const rectangle of rectangles) zoomUpdates.push((nextZoom) => rectangle.setAttribute('rx', String(5 / nextZoom)));
      if (geometry === 'panel' && shape.headerFill) {
        const header = [...group.children].find((child) => child.tagName === 'path');
        const dividerY = panelLayout(shape).dividerY;
        if (header) zoomUpdates.push((nextZoom) => header.setAttribute('d', panelHeaderPathData(shape, dividerY, 5 / nextZoom)));
      }
    } else if (geometry === 'diamond') {
      const path = group.firstElementChild!;
      zoomUpdates.push((nextZoom) => path.setAttribute('d', roundedDiamondPath(shape, 5 / nextZoom)));
    }
  }
  renderLabel(group, shape);
}

export function renderDiagram(parent: SVGGElement, shapes: CanvasShape[], zoom: number): (zoom: number) => void {
  parent.replaceChildren();
  const objects = svgElement(parent, 'g', { class: 'totonio-objects' });
  const labels = svgElement(parent, 'g', { class: 'totonio-connector-labels' });
  const zoomUpdates: Array<(zoom: number) => void> = [];
  for (const shape of shapesInPaintOrder(shapes)) renderShape(objects, labels, shape, shapes, zoom, zoomUpdates);
  return (nextZoom) => { for (const update of zoomUpdates) update(nextZoom); };
}