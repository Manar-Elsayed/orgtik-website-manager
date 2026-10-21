import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const files = fs.readdirSync(path.join(import.meta.dirname, 'lib')).filter(name => /^(session-|workspace-|whiteboard-scene|identity-effects|business-calendar|legacy-tool-replay|task-sample-assets|mailbox-ui).*\.test\.js$/.test(name)).map(name => `lib/${name}`);
for (const app of ['tasks', 'files', 'hr', 'sales', 'marketing', 'chats']) files.push(...fs.readdirSync(path.join(import.meta.dirname, 'apps', app)).filter(name => name.endsWith('.test.js')).map(name => `apps/${app}/${name}`));
files.push('apps/wm/state-codec.test.js');
// Each file can itself start several private HTTP workers. Run fixture files
// serially so desktop background builds do not overwhelm their setup requests.
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: import.meta.dirname, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
