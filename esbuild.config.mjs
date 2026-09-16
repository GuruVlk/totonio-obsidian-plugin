import esbuild from 'esbuild';
import process from 'node:process';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';

const prod = process.argv[2] === 'production';
const notices = ['LICENSE', 'THIRD_PARTY_NOTICES.md']
  .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n\n');
const context = await esbuild.context({
  banner: { js: `/*!\n${notices.replaceAll('*/', '* /')}\n*/` },
  legalComments: 'inline',
  entryPoints: ['src/main.ts'],
  bundle: true,
  loader: { '.webp': 'dataurl', '.png': 'dataurl' },
  external: ['obsidian', 'electron', '@codemirror/autocomplete', '@codemirror/collab',
    '@codemirror/commands', '@codemirror/language', '@codemirror/lint', '@codemirror/search',
    '@codemirror/state', '@codemirror/view', '@lezer/common', '@lezer/highlight', '@lezer/lr',
    ...builtinModules],
  format: 'cjs',
  target: 'es2021',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
});
if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}