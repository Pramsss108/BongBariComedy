// build-server.mjs — Custom esbuild config that inlines https-proxy-agent
// (the VM's Node 22 can't resolve its ESM exports via legacy main)
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  outdir: 'dist',
  alias: {
    '@shared': path.resolve(__dirname, 'shared'),
  },
  // External everything EXCEPT https-proxy-agent and path aliases
  plugins: [{
    name: 'selective-external',
    setup(b) {
      // These get inlined (bundled) instead of left external
      const INLINE = new Set(['https-proxy-agent', 'agent-base']);
      // Path aliases from tsconfig/vite — always inline
      const ALIAS_PREFIXES = ['@shared/', '@/', '@assets/'];
      b.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return;
        // Never externalize path aliases
        if (ALIAS_PREFIXES.some(p => args.path.startsWith(p))) return;
        // bare specifiers (no ./ or ../ prefix) = node_modules
        if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
          const pkgName = args.path.startsWith('@')
            ? args.path.split('/').slice(0, 2).join('/')
            : args.path.split('/')[0];
          if (!INLINE.has(pkgName)) {
            return { path: args.path, external: true };
          }
        }
      });
    }
  }],
});
console.log('✅ Server bundle built (https-proxy-agent inlined)');
