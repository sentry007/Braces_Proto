import { defineConfig } from 'tsup';

// The .vsix is packaged with --no-dependencies, so everything except the
// VS Code API itself must be bundled into dist/extension.js.
export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  external: ['vscode'],
  // Bundle every dependency except the `vscode` module provided by the editor
  noExternal: [/^(?!vscode$)/],
  minify: true,
  sourcemap: false,
  clean: true,
});
