import { imageLabelBounds, labelFontSize } from './core/appearance';
import { connectorRouteGeometry } from './core/connectorRouting';
import { boundsForShape, connectorPathPoints, nearestPolylinePoint, shapeBounds, shapeCenter } from './core/geometry';
import type { Bounds } from './core/geometry';
import { getShapeDefinition } from './core/shapeRegistry';
import type { CanvasShape, Point } from './core/types';

const HOVER_TOLERANCE_PX = 6;

const unrotate = (point: Point, center: Point, degrees = 0): Point => {
  if (!degrees) return point;
  const radians = (-degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians), y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians) };
};

// Rotation turns about the shape's own centre, as the renderer does, even when the hit box is wider (image labels).
const insideBounds = (point: Point, bounds: Bounds, center: Point, degrees?: number): boolean => {
  const local = unrotate(point, center, degrees);
  return local.x >= bounds.left && local.x <= bounds.right && local.y >= bounds.top && local.y <= bounds.bottom;
};

export const documentHasNotes = (shapes: CanvasShape[]): boolean => shapes.some((shape) => Boolean(shape.note));

/**
 * Topmost object under a diagram point, given shapes topmost first: connector labels (painted above everything),
 * then drawn objects, then the undrawn frames and groups around them.
 */
export function shapeAtPoint(topmostFirst: CanvasShape[], shapes: CanvasShape[], point: Point, zoom: number): CanvasShape | undefined {
  const tolerance = HOVER_TOLERANCE_PX / zoom;
  const geometry = (shape: CanvasShape) => getShapeDefinition(shape.type).geometry;
  for (const shape of topmostFirst) {
    if (geometry(shape) !== 'connector' || !shape.label) continue;
    const label = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection, shape.strokeWidth ?? 2,
      shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap).labelLayout;
    if (!label) continue;
    const local = unrotate(point, label.center, label.rotation);
    if (Math.abs(local.x - label.center.x) <= label.width / 2 && Math.abs(local.y - label.center.y) <= label.height / 2) return shape;
  }
  for (const shape of topmostFirst) {
    const kind = geometry(shape);
    if (kind === 'frame' || kind === 'group') continue;
    if (kind === 'connector') {
      const points = connectorPathPoints(shape, shapes);
      if (points.length && nearestPolylinePoint(point, points).distance <= (shape.strokeWidth ?? 2) / 2 + tolerance) return shape;
      continue;
    }
    const bounds = shape.type === 'image' && shape.label?.trim() ? imageLabelBounds(shape) : shapeBounds(shape);
    if (insideBounds(point, bounds, shapeCenter(shape), shape.rotation)) return shape;
  }
  for (const shape of topmostFirst) {
    const kind = geometry(shape);
    if (kind === 'frame' && insideBounds(point, shapeBounds(shape), shapeCenter(shape), shape.rotation)) return shape;
    if (kind === 'group' && insideBounds(point, boundsForShape(shape, shapes), shapeCenter(shape))) return shape;
  }
  return undefined;
}
