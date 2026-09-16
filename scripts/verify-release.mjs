import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const packageInfo = JSON.parse(read('package.json'));
const versions = JSON.parse(read('versions.json'));
assert.equal(manifest.id, 'totonio-presentation');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.version, packageInfo.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.equal(packageInfo.license, 'MIT');
assert.equal(manifest.author, 'GuruVlk');
assert.equal(manifest.fundingUrl, 'https://www.buymeacoffee.com/vladimirplk');
assert.ok(manifest.description.length <= 250 && manifest.description.endsWith('.'));
const bundle = read('main.js');
new Script(bundle, { filename: 'main.js' });
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  assert.ok(bundle.includes(read(file).replaceAll('*/', '* /')), `Missing bundled notices: ${file}`);
}
assert.ok(bundle.includes('data:image/webp;'), 'The mascot must be bundled offline');
assert.ok(bundle.includes('data:image/png;'), 'The viewer screenshot must be bundled offline');
assert.ok(!bundle.includes('/Users/'), 'Release must not contain machine-specific paths');
assert.ok(read('styles.css').includes('.totonio-viewer'), 'Missing viewer styles');
const runtimeImports = new Set();
const source = ts.createSourceFile('main.js', bundle, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const visit = (node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
    const argument = node.arguments[0];
    assert.ok(argument && ts.isStringLiteral(argument), 'Unexpected dynamic runtime dependency');
    runtimeImports.add(argument.text);
  }
  ts.forEachChild(node, visit);
};
visit(source);
assert.deepEqual([...runtimeImports].sort(), ['obsidian']);
console.log(`Verified ${manifest.id} ${manifest.version}: metadata, syntax, offline assets, notices, and Obsidian-only runtime imports.`);