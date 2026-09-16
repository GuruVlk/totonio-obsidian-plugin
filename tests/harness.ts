import '../styles.css';
import { loadDocument } from '../src/document';
import { Viewer, showError } from '../src/viewer';
import { sampleDocument, sampleJson } from './fixture';

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
  mount, sampleJson, sampleDocument,
  get view() { return viewer?.presentation.view; },
  get frameIndex() { return viewer?.presentation.frameIndex; },
  get opens() { return opens; },
  dispose: () => viewer?.dispose(),
};
declare global { interface Window { harness: typeof api } }
window.harness = api;
mount(sampleJson, new URLSearchParams(location.search).has('preview'));