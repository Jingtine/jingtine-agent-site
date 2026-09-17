const path = require('node:path');
const { parseArgs } = require('node:util');
const Hexo = require('hexo');

// Hexo 8 wraps every scripts/ file as CommonJS, including standalone .mjs tools.
// Keep its npm/theme plugins, and explicitly load only the site's Hexo extension.
const siteRoot = path.join(__dirname, '..');
const hexo = new Hexo(siteRoot, {});
hexo.script_dir = '';
let server;

async function stop() {
  hexo.unwatch();
  if (server) server.close();
  await hexo.exit();
  process.exit();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { port: { type: 'string', short: 'p' }, ip: { type: 'string', short: 'i' }, static: { type: 'boolean', short: 's' } },
  });
  const command = positionals[0];
  if (!['clean', 'generate', 'server'].includes(command) || positionals.length !== 1) throw new Error('Usage: node scripts/hexo-runner.cjs clean|generate|server [--port PORT] [--ip IP] [--static]');
  await hexo.init();
  await hexo.loadPlugin(path.join(siteRoot, 'scripts', 'tags.js'));
  server = await hexo.call(command, values);
  if (command !== 'server') await hexo.exit();
}

main().catch(async error => {
  hexo.unwatch();
  await hexo.exit(error);
  process.exitCode = 2; // Match Hexo CLI's error exit status.
});
