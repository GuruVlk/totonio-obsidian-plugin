import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = await build({ entryPoints: ['tests/fixture.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { sampleDocument } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
mkdirSync('examples', { recursive: true });
writeFileSync('examples/Presentation.totonio', JSON.stringify(sampleDocument, null, 2) + '\n');
writeFileSync('examples/Free-view.totonio', JSON.stringify({ ...sampleDocument,
  shapes: sampleDocument.shapes.filter((shape) => shape.type !== 'frame'),
}, null, 2) + '\n');
console.log('Generated the two local v3 example documents.');