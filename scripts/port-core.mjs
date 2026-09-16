import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';

const source = resolve(process.argv[2], 'src/canvas');
const destination = resolve('src/core');
const roots = {
  'document.ts': ['parseTotonioDocument', 'canvasStateFromDocument'],
  'geometry.ts': ['shapeBounds', 'visualBoundsForShape', 'connectorPathPoints', 'parallelSegments', 'shapesInPaintOrder'],
  'appearance.ts': ['bodyTextDecoration', 'CODE_FONT_FAMILY', 'databaseIconLayout', 'firewallLayout',
    'labelFontSize', 'layoutSpans', 'legendLayout', 'panelLayout', 'personLayout', 'shapeIconLayout',
    'shapeLabelLayout', 'shapeLabelLayoutLines', 'shapeLabelTextDecoration', 'strokeDasharray'],
  'connectorRouting.ts': ['connectorRouteGeometry', 'routeSegmentPathData'],
  'shapePaths.ts': ['arrowPathData', 'bracketsPathData', 'cloudPathData', 'cylinderMetrics',
    'cylinderPathData', 'panelHeaderPathData', 'roundedDiamondPath'],
  'shapeRegistry.ts': ['getShapeDefinition'],
  'types.ts': ['CanvasShape', 'CanvasState', 'View', 'Point'],
};
const host = ts.createCompilerHost({});
const originalRead = host.readFile;
host.readFile = (path) => {
  let text = originalRead(path);
  if (path === resolve(source, 'document.ts')) {
    text = text.replace("value === DOCUMENT_FORMAT || value === LEGACY_DOCUMENT_FORMAT", "value === DOCUMENT_FORMAT");
    text = text.replace('value === 1 || value === 2 || value === 3', 'value === 3');
    text = text.replace('value.version >= ASSET_DOCUMENT_VERSION ? value.assets : []', 'value.assets');
    text = text.replace(/  if \(value.version < ASSET_DOCUMENT_VERSION[^\n]+\n/, '');
    text = text.replace('value.version < NORMALISED_BORDER_VERSION ? normalisedBorderPositions(parsedShapes) : parsedShapes', 'parsedShapes');
    text = text.replace('normalizeTags(value as string[])', 'normalizeTags(value)');
    text = text.replace('value.routePoints.every((point) =>', 'value.routePoints.every((point: unknown): point is Point =>');
    text = text.replace('({ x: point.x as number, y: point.y as number })', '({ x: point.x, y: point.y })');
  }
  return text;
};
const program = ts.createProgram(Object.keys(roots).map((file) => resolve(source, file)), {
  target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.ESNext, strict: true,
}, host);
const checker = program.getTypeChecker();
const selected = new Set();
const imports = new Map();
const visitSymbol = (symbol) => {
  if (!symbol) return;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    for (const declaration of symbol.declarations ?? []) {
      if (ts.isImportSpecifier(declaration)) {
        const statement = declaration.parent.parent.parent;
        if (!imports.has(statement)) imports.set(statement, new Set());
        imports.get(statement).add(declaration.name.text);
      }
    }
    symbol = checker.getAliasedSymbol(symbol);
  }
  for (const declaration of symbol.declarations ?? []) {
    const file = declaration.getSourceFile();
    if (dirname(file.fileName) !== source) continue;
    let statement = declaration;
    while (statement.parent && !ts.isSourceFile(statement.parent)) statement = statement.parent;
    if (selected.has(statement) || ts.isImportDeclaration(statement)) continue;
    selected.add(statement);
    const visit = (node) => {
      if (ts.isIdentifier(node)) visitSymbol(checker.getSymbolAtLocation(node));
      ts.forEachChild(node, visit);
    };
    visit(statement);
  }
};
for (const [file, names] of Object.entries(roots)) {
  const module = program.getSourceFile(resolve(source, file));
  const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(module));
  for (const name of names) {
    const symbol = exports.find((entry) => entry.name === name);
    if (!symbol) throw new Error(`Missing source export: ${file}:${name}`);
    visitSymbol(symbol);
  }
}
mkdirSync(destination, { recursive: true });
const printer = ts.createPrinter({ removeComments: true });
for (const file of program.getSourceFiles()) {
  if (dirname(file.fileName) !== source) continue;
  const statements = file.statements.flatMap((statement) => {
    if (selected.has(statement)) return [statement];
    if (!imports.has(statement)) return [];
    const bindings = statement.importClause.namedBindings;
    const elements = bindings.elements.filter((entry) => imports.get(statement).has(entry.name.text));
    return [ts.factory.updateImportDeclaration(statement, statement.modifiers,
      ts.factory.updateImportClause(statement.importClause, statement.importClause.isTypeOnly,
        undefined, ts.factory.updateNamedImports(bindings, elements)), statement.moduleSpecifier, undefined)];
  });
  if (!statements.length) continue;
  writeFileSync(resolve(destination, basename(file.fileName)), printer.printFile(ts.factory.updateSourceFile(file, statements)));
  console.log(`${basename(file.fileName)}: ${statements.length} declarations`);
}
for (const name of ['one-mobility-city.totonio', 'the-commuter.totonio']) {
  mkdirSync(resolve('tests/fixtures'), { recursive: true });
  writeFileSync(resolve('tests/fixtures', name), readFileSync(resolve(process.argv[2], name)));
}