// build-server.mjs — Custom esbuild config for Oracle VM (503MB RAM)
// - Inlines https-proxy-agent + xml2js (Node 22 ESM can't resolve their legacy main)
// - Replaces banned heavy packages (vite, xlsx, etc.) with empty stubs at bundle time
// - Resolves path aliases (@shared, @, @assets)
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Per-package ESM stubs — explicit named exports for what the codebase imports
const STUB_SOURCES = {
  vite: `const noop=()=>{};const noopAsync=async()=>{};
export const createServer=noopAsync;
export const createLogger=()=>({info:noop,warn:noop,error:noop,clearScreen:noop,warnOnce:noop});
export const defineConfig=(c)=>c;
export default {createServer,createLogger,defineConfig};`,
  'vite-plugin-compression2': `export default ()=>({name:'noop'});`,
  '@vitejs/plugin-react': `export default ()=>({name:'noop'});`,
  xlsx: `const sheet={SheetNames:[],Sheets:{}};
export const read=()=>sheet;
export const readFile=()=>sheet;
export const write=()=>Buffer.alloc(0);
export const writeFile=()=>{};
export const utils={sheet_to_json:()=>[],json_to_sheet:()=>({}),book_new:()=>({}),book_append_sheet:()=>{},aoa_to_sheet:()=>({}),sheet_to_csv:()=>''};
export default {read,readFile,write,writeFile,utils};`,
  '@gradio/client': `export class Client{static async connect(){return new Client();}async predict(){return{data:[]};}}
export const handle_file=(f)=>f;
export default {Client,handle_file};`,
  'wink-nlp': `export default ()=>({readDoc:()=>({sentences:()=>({out:()=>[]}),tokens:()=>({out:()=>[]})}),its:{},as:{}});`,
  'wink-eng-lite-web-model': `export default {};`,
  'ffmpeg-static': `export default null;`,
  'youtube-po-token-generator': `export const generate=async()=>({visitorData:'',poToken:''});
export default {generate};`,
  'firebase-admin': `const noop=()=>{};const stub=new Proxy(function(){},{get:()=>stub,apply:()=>stub,construct:()=>stub});
export default stub;
export const apps=[];
export const initializeApp=()=>stub;
export const credential={cert:()=>stub,applicationDefault:()=>stub};
export const auth=()=>stub;
export const firestore=()=>stub;`,
};

// Path-pattern stubs (relative imports of vite.config etc.)
const PATH_STUB_PATTERNS = [
  /^\.\.\/vite\.config$/,
  /^\.\.\/vite\.config\.ts$/,
];

await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  outdir: 'dist',
  alias: {
    '@shared': path.resolve(__dirname, 'shared'),
  },
  // Inject `require` so bundled CJS packages (xml2js etc.) can `require('events')`
  banner: {
    js: `import { createRequire as __bb_createRequire } from 'module';
const require = __bb_createRequire(import.meta.url);`,
  },
  plugins: [{
    name: 'vm-safe-external',
    setup(b) {
      // ESM-broken pkgs that must be inlined
      const INLINE = new Set(['https-proxy-agent', 'agent-base', 'xml2js', 'sax', 'xmlbuilder']);
      const ALIAS_PREFIXES = ['@shared/', '@/', '@assets/'];

      b.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return;

        // Stub vite.config relative imports
        if (PATH_STUB_PATTERNS.some(re => re.test(args.path))) {
          return { path: 'vite', namespace: 'vm-stub' };
        }

        if (ALIAS_PREFIXES.some(p => args.path.startsWith(p))) return;

        // bare specifier
        if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
          const pkgName = args.path.startsWith('@')
            ? args.path.split('/').slice(0, 2).join('/')
            : args.path.split('/')[0];

          if (STUB_SOURCES[pkgName]) {
            return { path: pkgName, namespace: 'vm-stub' };
          }
          if (INLINE.has(pkgName)) return;
          return { path: args.path, external: true };
        }
      });

      b.onLoad({ filter: /.*/, namespace: 'vm-stub' }, args => ({
        contents: STUB_SOURCES[args.path] || 'export default {};',
        loader: 'js',
      }));
    },
  }],
});
console.log('✅ Server bundle built (VM-safe: banned pkgs stubbed, ESM-broken pkgs inlined)');

