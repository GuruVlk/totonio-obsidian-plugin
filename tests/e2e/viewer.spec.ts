import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/harness.html');
  await expect(page.locator('.totonio-frame-status')).toContainText('1 / 2');
});

test('glides through real presentation pixels without rebuilding diagram nodes', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    const sample = window.harness.sampleDocument;
    window.harness.mount(JSON.stringify({ ...sample, shapes: sample.shapes.map((shape) =>
      shape.id === 'frame-2' ? { ...shape, width: 600, height: 350 } : shape) }));
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const camera = () => page.locator('.totonio-svg > g').evaluate((element) => {
    const matrix = (element as SVGGElement).transform.baseVal.consolidate()!.matrix;
    return { x: matrix.e, y: matrix.f, zoom: matrix.a };
  });
  await page.evaluate(() => {
    const scene = document.querySelector('.totonio-svg > g')!;
    Reflect.set(window, 'originalDiagramImage', scene.querySelector('image'));
    Reflect.set(window, 'diagramReplacements', 0);
    new MutationObserver((records) => {
      Reflect.set(window, 'diagramReplacements', Reflect.get(window, 'diagramReplacements') + records.length);
    }).observe(scene, { childList: true, subtree: true });
  });
  const from = await camera();
  const before = await page.locator('.totonio-svg').screenshot();
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  const to = await page.evaluate(() => window.harness.view!);
  await page.clock.runFor(420);
  const during = await camera();
  expect(during.x).toBeLessThan(from.x);
  expect(during.x).toBeGreaterThan(to.x);
  expect(during.zoom).toBeGreaterThan(Math.min(from.zoom, to.zoom));
  expect(during.zoom).toBeLessThan(Math.max(from.zoom, to.zoom));
  const midway = await page.locator('.totonio-svg').screenshot({ path: info.outputPath('glide-midway.png') });
  expect(midway.equals(before)).toBe(false);
  const pixels = PNG.sync.read(midway);
  let colors = 0;
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    if (Math.max(...pixels.data.subarray(offset, offset + 3)) - Math.min(...pixels.data.subarray(offset, offset + 3)) > 30) colors++;
  }
  expect(colors).toBeGreaterThan(100);
  await page.clock.runFor(440);
  const final = await camera();
  expect(final.x).toBeCloseTo(to.x, 3);
  expect(final.y).toBeCloseTo(to.y, 3);
  expect(final.zoom).toBeCloseTo(to.zoom, 5);
  expect(await page.evaluate(() => Reflect.get(window, 'diagramReplacements'))).toBe(0);
  expect(await page.evaluate(() => document.querySelector('.totonio-svg image') === Reflect.get(window, 'originalDiagramImage'))).toBe(true);
  await page.locator('.totonio-svg').screenshot({ path: info.outputPath('glide-complete.png') });
});

test('glide can be interrupted, disabled, and cancelled by resize or reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const scene = page.locator('.totonio-svg > g');
  const initial = await scene.getAttribute('transform');
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  await page.clock.runFor(210);
  const intermediate = await scene.getAttribute('transform');
  expect(intermediate).not.toBe(initial);
  await page.keyboard.press('ArrowLeft');
  expect(await scene.getAttribute('transform')).toBe(intermediate);
  await page.clock.runFor(860);
  expect(await scene.getAttribute('transform')).toBe(initial);
  await page.keyboard.press('PageDown');
  await page.clock.runFor(200);
  await page.keyboard.press('Escape');
  await page.clock.runFor(1000);
  await expect(scene).toHaveAttribute('transform', 'translate(38 54) scale(0.72)');
  await page.getByRole('button', { name: 'Start frames' }).click();
  await page.clock.runFor(100);
  await page.evaluate(() => { document.getElementById('pane')!.style.cssText = 'width:280px;height:420px'; });
  await page.clock.runFor(100);
  const resized = await scene.getAttribute('transform');
  await page.clock.runFor(1000);
  expect(await scene.getAttribute('transform')).toBe(resized);
  await page.getByRole('button', { name: 'Glide between frames' }).click();
  await expect(page.getByRole('button', { name: 'Glide between frames' })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('PageDown');
  const instant = await scene.getAttribute('transform');
  await page.clock.runFor(1000);
  expect(await scene.getAttribute('transform')).toBe(instant);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(30);
  await expect(page.getByRole('button', { name: 'Glide between frames' })).toBeDisabled();
  await page.keyboard.press('PageUp');
  const reduced = await scene.getAttribute('transform');
  await page.clock.runFor(1000);
  expect(await scene.getAttribute('transform')).toBe(reduced);
});

test('Open in Totonio opens only the website without sharing the diagram', async ({ page }) => {
  await page.evaluate(() => {
    Reflect.set(window, 'openedSites', []);
    window.open = (...args: Parameters<typeof window.open>) => {
      Reflect.get(window, 'openedSites').push(args);
      return null;
    };
  });
  const before = await page.evaluate(() => ({ view: window.harness.view, json: window.harness.sampleJson }));
  const button = page.getByRole('button', { name: 'Open in Totonio', exact: true });
  await button.click();
  expect(await page.evaluate(() => Reflect.get(window, 'openedSites'))).toEqual([
    ['https://totonio.pages.dev/', '_blank', 'noopener,noreferrer'],
  ]);
  expect(await page.evaluate(() => ({ view: window.harness.view, json: window.harness.sampleJson }))).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(button).toBeVisible();
  await button.click();
  expect(await page.evaluate(() => Reflect.get(window, 'openedSites').length)).toBe(2);
  await page.evaluate(() => window.harness.mount(window.harness.sampleJson, true));
  await expect(button).toHaveCount(0);
});

test('plugin information displays bundled art and a responsive support bar offline', async ({ page, context }, info) => {
  await context.setOffline(true);
  await page.evaluate(() => window.harness.info());
  await expect(page.getByRole('heading', { name: 'Made for viewing', exact: true })).toBeVisible();
  const images = page.locator('.totonio-info img');
  await expect(images).toHaveCount(2);
  expect(await images.evaluateAll(async (elements) => Promise.all(elements.map(async (element) => {
    const image = element as HTMLImageElement;
    await image.decode();
    return image.src.startsWith('data:image/') && image.naturalWidth > 0;
  })))).toEqual([true, true]);
  await expect(page.locator('.totonio-info-diagram img')).toHaveAttribute('alt', /Read-only Totonio plugin diagram view/);
  expect(await page.locator('#pane').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('info-top.png') });
  const coffee = page.getByRole('link', { name: 'Buy me a coffee (opens in your browser)' });
  await coffee.scrollIntoViewIfNeeded();
  await expect(coffee).toHaveAttribute('href', 'https://www.buymeacoffee.com/vladimirplk');
  expect(await coffee.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth;
  })).toBe(true);
  await page.screenshot({ path: info.outputPath('info-support.png') });
  await expect(page.locator('.totonio-info iframe, .totonio-info input')).toHaveCount(0);
});

test('renders a nonblank presentation with decoded offline assets', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('.totonio-arrowhead')).toHaveCount(4);
  const decoded = await page.locator('.totonio-svg image').evaluateAll(async (images) => Promise.all(images.map(async (element) => {
    const image = new Image();
    image.src = element.getAttribute('href')!;
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  })));
  expect(decoded.length).toBe(3);
  expect(decoded.every(Boolean)).toBe(true);
  const titleRight = await page.locator('[data-shape-id="title"] text').evaluate((element) => {
    const bounds = (element as SVGGraphicsElement).getBBox();
    return bounds.x + bounds.width;
  });
  expect(titleRight).toBeLessThan(674);
  const labelBounds = await page.locator('[data-shape-id="notes"] text').evaluateAll((labels) =>
    labels.map((element) => {
      const bounds = (element as SVGGraphicsElement).getBBox();
      return { right: bounds.x + bounds.width, bottom: bounds.y + bounds.height };
    }));
  for (const bounds of labelBounds) {
    expect(bounds.right).toBeLessThan(870);
    expect(bounds.bottom).toBeLessThan(318);
  }
  const screenshot = await page.locator('.totonio-svg').screenshot();
  const png = PNG.sync.read(screenshot);
  let colorful = 0;
  for (let offset = 0; offset < png.data.length; offset += 4) {
    const red = png.data[offset], green = png.data[offset + 1], blue = png.data[offset + 2];
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 30) colorful++;
  }
  expect(colorful).toBeGreaterThan(500);
  const arrow = PNG.sync.read(await page.locator('[data-shape-id="route-1"] .totonio-arrowhead').screenshot());
  let arrowPixels = 0;
  for (let offset = 0; offset < arrow.data.length; offset += 4) {
    if (arrow.data[offset] < 90 && arrow.data[offset + 1] > 80 && arrow.data[offset + 2] < 140) arrowPixels++;
  }
  expect(arrowPixels).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('presentation.png') });
  expect(errors).toEqual([]);
});

test('navigates with buttons and scoped keyboard keys then restores saved viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  await expect(page.locator('.totonio-frame-status')).toContainText('2 / 2');
  for (const [key, expected] of [['ArrowLeft', '1 / 2'], ['PageDown', '2 / 2'], ['PageUp', '1 / 2'], ['ArrowRight', '2 / 2']]) {
    await page.keyboard.press(key);
    await expect(page.locator('.totonio-frame-status')).toContainText(expected);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('.totonio-frame-dim')).toBeHidden();
  expect(await page.evaluate(() => window.harness.view)).toEqual({ x: 38, y: 54, zoom: 0.72 });
  await expect(page.getByRole('button', { name: 'Reset view' })).toBeVisible();
  await page.getByRole('button', { name: 'Start frames' }).click();
  await expect(page.locator('.totonio-frame-status')).toContainText('1 / 2');
});

test('opens frameless files at saved viewport and supports pan, zoom, reset, and fit', async ({ page }) => {
  await page.evaluate(() => {
    const sample = window.harness.sampleDocument;
    window.harness.mount(JSON.stringify({ ...sample, shapes: sample.shapes.filter((shape) => shape.type !== 'frame') }));
  });
  expect(await page.evaluate(() => window.harness.view)).toEqual({ x: 38, y: 54, zoom: 0.72 });
  await page.mouse.move(140, 240);
  await page.mouse.down();
  await page.mouse.move(190, 290, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.harness.view)).toEqual({ x: 88, y: 104, zoom: 0.72 });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate(() => window.harness.view!.zoom)).toBeGreaterThan(0.72);
  await page.getByRole('button', { name: 'Reset view' }).click();
  expect(await page.evaluate(() => window.harness.view)).toEqual({ x: 38, y: 54, zoom: 0.72 });
  await page.getByRole('button', { name: 'Fit content' }).click();
  expect(await page.evaluate(() => window.harness.view!.zoom)).not.toBe(0.72);
});

test('refits frames on pane resize and keeps controls inside the toolbar', async ({ page }) => {
  await page.evaluate(() => { document.getElementById('pane')!.style.cssText = 'width:280px;height:420px'; });
  await expect.poll(() => page.locator('.totonio-svg').getAttribute('viewBox')).toBe('0 0 280 380');
  const { view, bounds } = await page.evaluate(() => ({ view: window.harness.view!, bounds: document.querySelector('.totonio-surface')!.getBoundingClientRect().toJSON() }));
  expect(view.x).toBeGreaterThanOrEqual(31.9);
  expect(view.x + 900 * view.zoom).toBeLessThanOrEqual(bounds.width - 31.9);
  const overflow = await page.locator('.totonio-toolbar').evaluate((toolbar) => [...toolbar.querySelectorAll('button:not([hidden])')].some((button) => {
    const parent = toolbar.getBoundingClientRect(), child = button.getBoundingClientRect();
    return child.right > parent.right || child.left < parent.left || child.bottom > parent.bottom;
  }));
  expect(overflow).toBe(false);
});

test('static Markdown preview opens on click and keyboard, without pan or editing UI', async ({ page }, info) => {
  await page.evaluate(() => window.harness.mount(window.harness.sampleJson, true));
  await expect(page.locator('.totonio-toolbar')).toHaveCount(0);
  await expect(page.locator('input, textarea, [contenteditable], .resize-handle')).toHaveCount(0);
  const view = await page.evaluate(() => window.harness.view);
  await page.locator('.totonio-preview').hover();
  await page.mouse.wheel(0, -100);
  expect(await page.evaluate(() => window.harness.view)).toEqual(view);
  await page.screenshot({ path: info.outputPath('embed.png') });
  await page.getByRole('button', { name: 'Open Totonio system overview' }).click();
  await expect(page.locator('.totonio-toolbar')).toBeVisible();
  expect(await page.evaluate(() => window.harness.opens)).toBe(1);
  await page.evaluate(() => window.harness.mount(window.harness.sampleJson, true));
  await page.getByRole('button', { name: 'Open Totonio system overview' }).focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.harness.opens)).toBe(2);
});

test('works offline, isolates embedded SVG, and never creates executable label links', async ({ page, context }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4189') && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  await context.setOffline(true);
  await page.evaluate(() => {
    const sample = window.harness.sampleDocument;
    const hostileSvg = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>parent.__executed=true</script><image href="https://example.com/tracker.png" width="32" height="32"/><rect width="32" height="32" fill="red"/></svg>');
    window.harness.mount(JSON.stringify({ ...sample, assets: [{ id: 'preview', data: hostileSvg }, sample.assets[1]],
      shapes: sample.shapes.map((shape) => shape.id === 'title' ? { ...shape, label: '[Remote](https://example.com) <script>bad()</script>' } : shape) }));
  });
  await expect(page.locator('.totonio-svg')).toBeVisible();
  await expect(page.locator('.totonio-svg a, .totonio-svg script, iframe, foreignObject')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__executed'))).toBeUndefined();
  expect(externalRequests).toEqual([]);
});

test('reports bad JSON and unsupported files safely', async ({ page }) => {
  await page.evaluate(() => window.harness.mount('{'));
  await expect(page.getByRole('alert')).toHaveText('The file is not valid JSON.');
  await page.evaluate(() => window.harness.mount(JSON.stringify({ ...window.harness.sampleDocument, version: 2 })));
  await expect(page.getByRole('alert')).toContainText('Only version 3');
  await page.evaluate(() => window.harness.mount(JSON.stringify({ ...window.harness.sampleDocument, shapes: [{}] })));
  await expect(page.getByRole('alert')).toContainText('malformed');
});

test('cleans up observers and ignores keyboard input outside the viewer', async ({ page }) => {
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'outside';
    input.style.cssText = 'position:fixed;top:2px;right:2px;width:40px';
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.harness.frameIndex)).toBe(0);
  await page.evaluate(() => window.harness.dispose());
  await expect(page.locator('.totonio-viewer')).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(page.locator('.totonio-viewer')).toHaveCount(0);
});