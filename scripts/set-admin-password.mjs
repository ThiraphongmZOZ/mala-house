import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface, emitKeypressEvents } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { createPasswordHash } from '../lib/admin-password.mjs';

if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal so the password stays hidden.');
const local = process.argv.includes('--local');
if (!local && !process.argv.includes('--remote')) throw new Error('Choose --local or --remote.');
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const email = (await new Promise(resolve => prompt.question('Owner email: ', resolve))).trim().toLowerCase();
prompt.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email.');
async function password(label) {
  process.stdout.write(label);
  emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function key(text, info) {
      if (info.ctrl && info.name === 'c') { done(); reject(new Error('Cancelled')); }
      else if (info.name === 'return') { done(); resolve(value); }
      else if (info.name === 'backspace') value = value.slice(0, -1);
      else if (!info.ctrl && !info.meta && text) value += text;
    }
    function done() { process.stdin.off('keypress', key); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); }
    process.stdin.on('keypress', key);
  });
}
const first = await password('Password/passphrase (20–200 characters, hidden): ');
if (first !== await password('Confirm password (hidden): ')) throw new Error('Passwords do not match.');
const hash = await createPasswordHash(first);
if (local) {
  let vars = ''; try { vars = readFileSync('.dev.vars', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  vars = vars.split(/\r?\n/).filter(line => !/^ADMIN_(EMAIL|PASSWORD_HASH)=/.test(line)).join('\n');
  writeFileSync('.dev.vars', `${vars.trim()}\nADMIN_EMAIL=${email}\nADMIN_PASSWORD_HASH=${hash}\n`, { mode: 0o600 });
  console.log('Local owner account configured in ignored .dev.vars.');
} else {
  for (const [name, value] of [['ADMIN_EMAIL', email], ['ADMIN_PASSWORD_HASH', hash]]) {
    const result = spawnSync(process.execPath, ['./node_modules/wrangler/bin/wrangler.js', 'secret', 'put', name, '--config', 'wrangler.jsonc'], { input: value + '\n', stdio: ['pipe', 'inherit', 'inherit'] });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  console.log('Owner credentials stored as Cloudflare secrets. Existing sessions expire after password rotation.');
}
