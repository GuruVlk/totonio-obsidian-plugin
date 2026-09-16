import { canvasStateFromDocument, parseTotonioDocument } from './core/document';
import { getShapeDefinition } from './core/shapeRegistry';
import type { CanvasShape, CanvasState } from './core/types';

export function readEnvelope(json: string, path: string): Record<string, unknown> {
  if (!path.toLowerCase().endsWith('.totonio')) {
    throw new Error('Only .totonio files are supported. Legacy .tatamio files cannot be opened.');
  }
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The file does not contain a Totonio document.');
  }
  const document = value as Record<string, unknown>;
  if (document.format !== 'totonio') throw new Error('The file format must be "totonio".');
  if (document.version !== 3) {
    throw new Error(`Unsupported Totonio version ${String(document.version)}. Only version 3 is supported.`);
  }
  return document;
}

export function loadDocument(json: string, path: string): CanvasState {
  if (json.length > 64 * 1024 * 1024) throw new Error('The Totonio file exceeds the 64 MiB viewer limit.');
  const value = readEnvelope(json, path);
  if (Array.isArray(value.shapes) && value.shapes.length > 10_000) {
    throw new Error('The Totonio file exceeds the 10,000-shape viewer limit.');
  }
  const document = parseTotonioDocument(value);
  if (!document) throw new Error('The Totonio document is malformed or contains invalid references.');
  const state = canvasStateFromDocument(document);
  const byId = new Map(state.shapes.map((shape) => [shape.id, shape]));
  for (const shape of state.shapes) {
    if (!shape.id || !Number.isFinite(shape.x + shape.width) || !Number.isFinite(shape.y + shape.height)) {
      throw new Error('The Totonio document contains invalid shape bounds or identifiers.');
    }
    const parent = shape.parentId === null ? undefined : byId.get(shape.parentId);
    if (parent && parent.type !== 'group' && !getShapeDefinition(parent.type).canContain) {
      throw new Error('The Totonio document contains an invalid shape hierarchy.');
    }
  }
  const checked = new Set<string>();
  const active = new Set<string>();
  const visit = (shape: CanvasShape, depth: number) => {
    if (active.has(shape.id)) throw new Error('The Totonio document contains cyclic shape references.');
    if (depth > 128) throw new Error('The Totonio document exceeds the 128-level reference limit.');
    if (checked.has(shape.id)) return;
    active.add(shape.id);
    const references = [shape.parentId, ...[shape.start, shape.end].map((endpoint) => endpoint?.type === 'shape' ? endpoint.shapeId : null)];
    for (const reference of references) if (reference !== null && reference !== undefined) visit(byId.get(reference)!, depth + 1);
    active.delete(shape.id);
    checked.add(shape.id);
  };
  state.shapes.forEach((shape) => visit(shape, 0));
  return state;
}