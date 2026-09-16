import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDocument, readEnvelope } from '../src/document';
import { parseTotonioDocument } from '../src/core/document';

const document = {
  format: 'totonio', version: 3, assets: [], shapes: [],
  viewport: { x: 123, y: -45, zoom: 1.25 }, settings: { gridEnabled: true },
};

describe('version 3 boundary', () => {
  it('accepts v3 without changing the saved viewport', () => {
    expect(readEnvelope(JSON.stringify(document), 'diagram.totonio')).toEqual(document);
  });
  it.each([1, 2, 4, 99, '3', null])('rejects version %s', (version) => {
    expect(() => readEnvelope(JSON.stringify({ ...document, version }), 'diagram.totonio')).toThrow('Only version 3');
  });
  it('rejects .tatamio even with a current payload', () => {
    expect(() => readEnvelope(JSON.stringify(document), 'diagram.tatamio')).toThrow('Only .totonio');
  });
  it('rejects legacy format names', () => {
    expect(() => readEnvelope(JSON.stringify({ ...document, format: 'tatamio' }), 'diagram.totonio')).toThrow('format');
  });
  it('reports invalid JSON', () => {
    expect(() => readEnvelope('{', 'diagram.totonio')).toThrow('not valid JSON');
  });
  it.each(['null', '[]', 'true'])('rejects non-document JSON %s', (json) => {
    expect(() => readEnvelope(json, 'diagram.totonio')).toThrow('does not contain');
  });
});

describe('structural validation', () => {
  const shape = { id: 'box', type: 'rect', x: 10, y: 20, width: 100, height: 80, parentId: null, color: '#123456' };
  const load = (patch: Record<string, unknown>) => loadDocument(JSON.stringify({ ...document, ...patch }), 'test.totonio');
  it('loads a valid v3 diagram and restores viewport', () => {
    const state = load({ shapes: [shape] });
    expect(state.view).toEqual(document.viewport);
    expect(state.shapes[0]).toMatchObject(shape);
  });
  it.each(['one-mobility-city', 'the-commuter'])('rejects the actual legacy %s document', (name) => {
    const json = readFileSync(new URL(`./fixtures/${name}.totonio`, import.meta.url), 'utf8');
    expect(() => loadDocument(json, `${name}.totonio`)).toThrow('Unsupported Totonio version 2');
  });
  it.each([1, 2, 4])('the ported parser itself rejects version %s', (version) => {
    expect(parseTotonioDocument({ ...document, version })).toBeNull();
  });
  it('preserves nested groups and page-space child coordinates', () => {
    const state = load({ shapes: [{ ...shape, type: 'group' }, { ...shape, id: 'child', parentId: 'box' }] });
    expect(state.shapes[1]).toMatchObject({ parentId: 'box', x: 10, y: 20 });
  });
  it.each([
    { shapes: [{}] }, { shapes: [shape, shape] }, { assets: null }, { shapes: [{ ...shape, parentId: 'missing' }] },
    { shapes: [{ ...shape, parentId: 'box' }] }, { shapes: [{ ...shape, type: 'unknown' }] },
    { shapes: [{ ...shape, type: 'frame' }] }, { shapes: [{ ...shape, fill: 'url(https://example.com)' }] },
    { shapes: [{ ...shape, type: 'line' }] }, { viewport: { x: 0, y: 0, zoom: 0 } },
    { shapes: [{ ...shape, type: 'image', imageAssetId: 'missing' }] },
    { shapes: [{ ...shape, type: 'image', imageData: 'https://example.com/image.png' }] },
  ])('rejects malformed structures %#', (patch) => {
    expect(() => load(patch)).toThrow('malformed');
  });
  it('rejects cyclic connector attachments', () => {
    expect(() => load({ shapes: [{ ...shape, type: 'line', start: { type: 'shape', shapeId: 'box' }, end: { type: 'free', x: 4, y: 5 } }] })).toThrow('cyclic');
  });
  it('resolves embedded image and corner-icon assets', () => {
    const data = 'data:image/png;base64,aGVsbG8=';
    const state = load({ assets: [{ id: 'asset', data }], shapes: [
      { ...shape, type: 'image', imageAssetId: 'asset' },
      { ...shape, id: 'icon', iconAssetId: 'asset', iconCorner: 'bottom-right' },
    ] });
    expect(state.shapes[0].imageData).toBe(data);
    expect(state.shapes[1].iconData).toBe(data);
    expect(state.shapes[1].iconCorner).toBe('bottom-right');
  });
});