import esbuild from 'esbuild';

const context = await esbuild.context({
  entryPoints: ['tests/harness.ts'], bundle: true, format: 'esm', outdir: '.test-build',
  entryNames: 'harness', target: 'es2021', sourcemap: true,
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
});
await context.serve({ servedir: '.', host: '127.0.0.1', port: 4189 });
console.log('Totonio browser test harness: http://127.0.0.1:4189/tests/harness.html');