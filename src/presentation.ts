import { labelFontSize } from './core/appearance';
import { connectorRouteGeometry } from './core/connectorRouting';
import { connectorPathPoints, shapeBounds, visualBoundsForShape } from './core/geometry';
import type { Bounds } from './core/geometry';
import type { CanvasShape, CanvasState, Point, View } from './core/types';

export type Size = { width: number; height: number };

export function fitBounds(bounds: Bounds, size: Size, padding = 32): View {
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const inset = Math.min(padding, size.width / 4, size.height / 4);
  const zoom = Math.min(3, Math.max(Number.EPSILON,
    Math.min((size.width - inset * 2) / width, (size.height - inset * 2) / height)));
  return {
    x: size.width / 2 - (bounds.left + width / 2) * zoom,
    y: size.height / 2 - (bounds.top + height / 2) * zoom,
    zoom,
  };
}

export function contentBounds(shapes: CanvasShape[]): Bounds | null {
  let result: Bounds | null = null;
  const include = (bounds: Bounds, stroke = 0) => {
    result = {
      left: Math.min(result?.left ?? Infinity, bounds.left - stroke),
      top: Math.min(result?.top ?? Infinity, bounds.top - stroke),
      right: Math.max(result?.right ?? -Infinity, bounds.right + stroke),
      bottom: Math.max(result?.bottom ?? -Infinity, bounds.bottom + stroke),
    };
  };
  for (const shape of shapes) {
    if (shape.type === 'group' || shape.type === 'frame') continue;
    include(visualBoundsForShape(shape, shapes), (shape.strokeWidth ?? 2) * 2);
    if (shape.type === 'line' || shape.type === 'plain-line') {
      const route = connectorRouteGeometry(connectorPathPoints(shape, shapes), shape.arrowDirection,
        shape.strokeWidth ?? 2, shape.label, labelFontSize(shape.labelSize), shape.labelPosition, shape.labelRotation, shape.labelWrap);
      if (route.labelLayout) include(route.labelLayout.bounds);
      for (const arrow of [route.startArrow, route.endArrow]) {
        if (arrow) include({ left: Math.min(arrow.tip.x, arrow.left.x, arrow.right.x),
          right: Math.max(arrow.tip.x, arrow.left.x, arrow.right.x),
          top: Math.min(arrow.tip.y, arrow.left.y, arrow.right.y), bottom: Math.max(arrow.tip.y, arrow.left.y, arrow.right.y) });
      }
    }
  }
  return result;
}

export class Presentation {
  readonly frames: CanvasShape[];
  readonly savedView: View;
  view: View;
  frameIndex: number | null;
  private freeView: View;

  constructor(readonly document: CanvasState, private size: Size) {
    this.savedView = { ...document.view };
    this.view = { ...this.savedView };
    this.freeView = { ...this.savedView };
    this.frames = document.shapes.filter((shape) => shape.type === 'frame')
      .sort((first, second) => (first.frameOrder ?? 0) - (second.frameOrder ?? 0));
    this.frameIndex = this.frames.length ? 0 : null;
    this.resize(size);
  }

  get activeFrame(): CanvasShape | null {
    return this.frameIndex === null ? null : this.frames[this.frameIndex];
  }

  resize(size: Size): void {
    this.size = size;
    if (this.activeFrame && size.width > 0 && size.height > 0) this.view = fitBounds(shapeBounds(this.activeFrame), size);
  }

  step(direction: number): void {
    if (!this.frames.length) return;
    if (this.frameIndex === null) {
      this.freeView = { ...this.view };
      this.frameIndex = direction < 0 ? this.frames.length - 1 : 0;
    } else {
      this.frameIndex = (this.frameIndex + direction + this.frames.length) % this.frames.length;
    }
    this.resize(this.size);
  }

  escape(): void {
    if (this.frameIndex === null) return;
    this.frameIndex = null;
    this.view = { ...this.freeView };
  }

  reset(): void {
    this.frameIndex = null;
    this.view = { ...this.savedView };
  }

  fitContent(): void {
    this.frameIndex = null;
    const bounds = contentBounds(this.document.shapes);
    this.view = bounds ? fitBounds(bounds, this.size) : { ...this.savedView };
  }

  pan(delta: Point): void {
    if (this.frameIndex !== null) return;
    this.view = { ...this.view, x: this.view.x + delta.x, y: this.view.y + delta.y };
  }

  zoomAt(point: Point, factor: number): void {
    if (this.frameIndex !== null) return;
    const zoom = Math.max(0.001, Math.min(16, this.view.zoom * factor));
    const ratio = zoom / this.view.zoom;
    this.view = { x: point.x - (point.x - this.view.x) * ratio, y: point.y - (point.y - this.view.y) * ratio, zoom };
  }
}