import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.argv[2]);
const output = resolve('src/assets');
mkdirSync(output, { recursive: true });
const result = await build({
  stdin: {
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
      import {PresentationFrames, CornerIcons} from './src/hints/teachingVisuals';
      export const pictures = {frames: renderToStaticMarkup(React.createElement(PresentationFrames)),
        icons: renderToStaticMarkup(React.createElement(CornerIcons))};`,
    resolveDir: source, loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
});
const module = { exports: {} };
const { createRequire } = await import('node:module');
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 440, height: 360 }, deviceScaleFactor: 2 });
  for (const [name, markup] of Object.entries(module.exports.pictures)) {
    await page.setContent(`<style>body{margin:0}svg{display:block;width:440px;height:360px}</style>${markup}`);
    await page.locator('svg').screenshot({ path: resolve(output, `hint-${name}.png`) });
  }
} finally { await browser.close(); }
copyFileSync(resolve(source, 'src/assets/tanuki.webp'), resolve(output, 'tanuki.webp'));
console.log('Copied welcome mascot and captured two original hint illustrations.');