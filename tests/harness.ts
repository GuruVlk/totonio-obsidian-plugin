import '../styles.css';
import './dom-helpers';
import { loadDocument } from '../src/document';
import { Viewer, showError } from '../src/viewer';
import { sampleDocument, sampleJson } from './fixture';
import { renderInfo } from '../src/info';
import demo from '../src/assets/green-tea.json';
import { copyDiagramJson, copyDiagramPng, pngScale } from '../src/copy';
import { exportSvg } from '../src/core/export';

const pane = document.getElementById('pane')!;
let viewer: Viewer | undefined;
let opens = 0;
let menus = 0;
let source = sampleJson;
function mount(json = sampleJson, preview = false): void {
  viewer?.dispose();
  viewer = undefined;
  source = json;
  try {
    viewer = new Viewer(pane, loadDocument(json, 'sample.totonio'), {
      title: 'Totonio system overview', preview,
      open: () => { opens++; mount(json); },
      contextMenu: () => { menus++; },
    });
  } catch (error) { showError(pane, error); }
}

const api = {
  demo: () => mount(JSON.stringify(demo)),
  info: () => {
    viewer?.dispose();
    viewer = undefined;
    pane.style.cssText = 'height:100%;overflow:auto;padding:24px';
    renderInfo(pane, '0.1.0');
  },
  mount, sampleJson, sampleDocument,
  get view() { return viewer?.presentation.view; },
  get frameIndex() { return viewer?.presentation.frameIndex; },
  get opens() { return opens; },
  get menus() { return menus; },
  copyJson: () => copyDiagramJson(document, source),
  copyPng: () => copyDiagramPng(document, viewer!.presentation.document.shapes),
  pngSize: () => {
    const shapes = viewer!.presentation.document.shapes;
    const { svg, width, height } = exportSvg(shapes)!;
    const scale = pngScale(width, height);
    const [left, top] = /viewBox="(\S+) (\S+)/.exec(svg)!.slice(1).map(Number);
    const images = shapes.filter((shape) => shape.type === 'image' && !shape.rotation).map((shape) => ({
      x: Math.ceil((shape.x - left) * scale), y: Math.ceil((shape.y - top) * scale),
      width: Math.floor(shape.width * scale) - 1, height: Math.floor(shape.height * scale) - 1,
    }));
    return { width: Math.floor(width * scale), height: Math.floor(height * scale), scale, images };
  },
  dispose: () => viewer?.dispose(),
};
declare global { interface Window { harness: typeof api } }
window.harness = api;
mount(sampleJson, new URLSearchParams(location.search).has('preview'));