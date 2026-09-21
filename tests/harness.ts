import '../styles.css';
import './dom-helpers';
import { loadDocument } from '../src/document';
import { Viewer, showError } from '../src/viewer';
import { sampleDocument, sampleJson } from './fixture';
import { renderInfo } from '../src/info';
import demo from '../src/assets/green-tea.json';

const pane = document.getElementById('pane')!;
let viewer: Viewer | undefined;
let opens = 0;
function mount(json = sampleJson, preview = false): void {
  viewer?.dispose();
  viewer = undefined;
  try {
    viewer = new Viewer(pane, loadDocument(json, 'sample.totonio'), {
      title: 'Totonio system overview', preview,
      open: () => { opens++; mount(json); },
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
  dispose: () => viewer?.dispose(),
};
declare global { interface Window { harness: typeof api } }
window.harness = api;
mount(sampleJson, new URLSearchParams(location.search).has('preview'));