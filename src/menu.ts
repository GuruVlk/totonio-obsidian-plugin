import { Menu, Notice } from 'obsidian';
import { copyDiagramJson, copyDiagramPng } from './copy';
import type { CanvasShape } from './core/types';

function report(task: Promise<void>, done: string): void {
  task.then(() => new Notice(done), (error: unknown) => {
    new Notice(`Could not copy the diagram: ${error instanceof Error ? error.message : String(error)}`);
  });
}

export function showDiagramMenu(event: MouseEvent, json: string, shapes: CanvasShape[]): void {
  const doc = (event.target as Node | null)?.ownerDocument ?? activeDocument;
  const menu = new Menu();
  menu.addItem((item) => item.setTitle('Copy as JSON').setIcon('braces')
    .onClick(() => report(copyDiagramJson(doc, json), 'Diagram JSON copied')));
  menu.addItem((item) => item.setTitle('Copy as PNG').setIcon('image')
    .onClick(() => report(copyDiagramPng(doc, shapes), 'Diagram PNG copied')));
  menu.showAtMouseEvent(event);
}
