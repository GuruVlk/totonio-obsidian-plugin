import { Coffee } from 'lucide';
import mascot from './assets/tanuki.webp';
import diagramView from './assets/diagram-view.png';
import { svgElement } from './render';

export const SUPPORT_URL = 'https://www.buymeacoffee.com/vladimirplk';

export type InfoHeading = (container: HTMLElement, title: string) => void;

const previewHeading: InfoHeading = (container, title) => {
  const heading = container.createDiv();
  heading.className = 'setting-item setting-item-heading';
  heading.setAttribute('role', 'heading');
  heading.setAttribute('aria-level', '2');
  heading.textContent = title;
  container.appendChild(heading);
};

export function renderInfo(container: HTMLElement, version: string, heading: InfoHeading = previewHeading): void {
  container.replaceChildren();
  const element = <Tag extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: Tag, text?: string, className?: string): HTMLElementTagNameMap[Tag] => {
    const node = parent.createEl(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const page = element(container, 'article', undefined, 'totonio-info');
  const header = element(page, 'header', undefined, 'totonio-info-header');
  element(header, 'p', `Version ${version} · By GuruVlk`, 'totonio-info-meta');
  element(header, 'p', 'Architecture and sequence diagrams alongside your notes. Create in Totonio, present in Obsidian.');
  const image = element(header, 'img', undefined, 'totonio-info-mascot');
  image.src = mascot;
  image.alt = 'Totonio tanuki painting a diagram';
  image.width = 720;
  image.height = 720;

  element(page, 'p', 'Inspect your Totonio diagrams without leaving your vault. Open a local .totonio file in a native workspace tab, follow its Presentation Frames, or explore freely with pan and zoom.');
  heading(page, 'Made for viewing');
  element(page, 'p', 'Shapes, nested containers, connectors, labels, embedded images, and corner icons stay together. Everything renders locally and offline. This is a read-only viewer: opening, navigating, and closing a diagram never saves or changes its source file.');

  const figure = element(page, 'figure', undefined, 'totonio-info-diagram');
  const artwork = element(figure, 'img');
  artwork.src = diagramView;
  artwork.alt = 'Read-only Totonio plugin diagram view with presentation navigation, shapes, connectors, and embedded images';
  artwork.width = 1280;
  artwork.height = 800;
  const caption = element(figure, 'figcaption');
  element(caption, 'strong', 'Your diagram in presentation view');
  element(caption, 'p', 'The plugin\'s own viewer displaying the sample diagram. Inspect the diagram and navigate its frames without editing the file.');

  heading(page, 'From system design to meeting notes');
  element(page, 'p', 'Keep an architecture map beside your design decisions, embed a process flow in a project note, or walk through an API sequence one frame at a time. The same saved diagram works as a full presentation and a compact Markdown preview.');

  const web = element(page, 'section', undefined, 'totonio-info-web');
  heading(web, 'Create and present in the Totonio web app');
  element(web, 'p', 'The web app is the authoring companion. The features below belong to Totonio on the web, not to the read-only Obsidian plugin.');
  const features = element(web, 'ul');
  element(features, 'li', 'Web presentations: create and order Presentation Frames, present a guided walkthrough, or explore the whole canvas. Saved frames can also be played inside Obsidian.');
  element(features, 'li', 'Object tags: tag shapes and connectors, search by tag, and filter or highlight parts of your diagram in the web app. This plugin does not provide tag filtering or connect these tags to Obsidian note tags.');
  element(features, 'li', 'PlantUML and Mermaid sequences: use Import > Sequence from script to generate editable Totonio objects from supported participant, message, reply, self-message, and note syntax. Save the result as a version 3 .totonio file to view it here.');
  element(web, 'p', 'Sequence import supports a subset of PlantUML and Mermaid, not every diagram type or language feature. Constructs such as alt/loop grouping and activation are not rendered by the generator. The plugin does not import scripts or render Mermaid code blocks.');
  const website = element(web, 'a', 'Open the Totonio web app');
  website.href = 'https://totonio.pages.dev/';
  website.target = '_blank';
  website.rel = 'noopener noreferrer';

  heading(page, 'Getting started');
  const steps = element(page, 'ol');
  element(steps, 'li', 'Place a version 3 .totonio file anywhere in your vault, outside its configuration folder, then click it in the file explorer.');
  element(steps, 'li', 'Use the previous/next buttons, Left/Right, or Page Up/Page Down to navigate frames. Focus the viewer first.');
  element(steps, 'li', 'Press Escape for free view. Drag to pan and scroll or pinch to zoom. Reset view restores the saved viewport; Fit content shows the whole diagram.');
  element(page, 'p', 'Diagrams without frames open at their saved viewport. Resizing the pane refits the active frame.');
  element(page, 'p', 'Frame navigation uses the same 840 ms glide as Totonio: gently eased movement and geometric zoom. Use the wind-icon Glide between frames toggle for instant transitions. Reduce Motion in your system settings disables glide automatically. The toggle applies only to the current view and is not saved.');

  heading(page, 'Embed in a note');
  element(page, 'p', 'Add a totonio code block containing one vault-relative file path. Click its static preview to open the full presentation.');
  const code = element(element(page, 'pre'), 'code');
  code.textContent = '```totonio\npath/to/diagram.totonio\n```';

  heading(page, 'Editing and compatibility');
  element(page, 'p', 'Use Open in Totonio in the viewer toolbar to open the website in your browser, then select your vault file there. The button does not send your diagram or its path. Save edits back to the same location; if your browser downloads a copy, replace the original manually. The Obsidian viewer refreshes when the source changes.');
  element(page, 'p', 'Only format "totonio", version 3 is supported. Legacy versions 1/2 and .tatamio files are not migrated. Invalid files show an error in the pane. There are no editing tools, exports, telemetry, or background network requests.');

  const support = element(page, 'footer', undefined, 'totonio-info-support');
  const copy = element(support, 'div');
  element(copy, 'strong', 'Support Totonio');
  element(copy, 'p', 'Made by GuruVlk. A coffee helps support continued development.');
  const link = element(support, 'a', undefined, 'totonio-coffee-link');
  link.href = SUPPORT_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Buy me a coffee (opens in your browser)');
  const icon = svgElement(link, 'svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  for (const [tag, attributes] of Coffee) svgElement(icon, tag as keyof SVGElementTagNameMap, attributes);
  element(link, 'span', 'Buy me a coffee');
  element(page, 'p', 'Website and support links open external pages only when you choose them. Viewing diagrams and this information page needs no connection.', 'totonio-info-meta');
}