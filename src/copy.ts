import { exportSvg } from './core/export';
import type { CanvasShape } from './core/types';

const MAX_DIMENSION = 8192;
// iOS WebKit refuses to draw a canvas larger than this many pixels.
const MAX_PIXELS = 16_777_216;

export function pngScale(width: number, height: number): number {
  return Math.min(2, MAX_DIMENSION / Math.max(width, height, 1), Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const scale = pngScale(width, height);
  const canvas = createEl('canvas');
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PNG rendering is unavailable on this device.');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = createEl('img');
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not render the diagram as PNG.'));
      image.src = url;
    });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create the PNG image.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clipboardOf(doc: Document): Clipboard {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (!clipboard) throw new Error('Clipboard access is unavailable on this device.');
  return clipboard;
}

export async function copyDiagramJson(doc: Document, json: string): Promise<void> {
  await clipboardOf(doc).writeText(json);
}

export async function copyDiagramPng(doc: Document, shapes: CanvasShape[]): Promise<void> {
  const exported = exportSvg(shapes);
  if (!exported) throw new Error('This diagram has nothing to copy.');
  const clipboard = clipboardOf(doc);
  const Item = doc.defaultView?.ClipboardItem;
  if (typeof clipboard.write !== 'function' || !Item) throw new Error('Copying images is unavailable on this device.');
  // A pending blob keeps the click's user activation, which WebKit requires for clipboard writes.
  await clipboard.write([new Item({ 'image/png': svgToPngBlob(exported.svg, exported.width, exported.height) })]);
}
