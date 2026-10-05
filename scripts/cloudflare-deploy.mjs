import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
assert.match(config.d1_databases?.[0]?.database_id ?? '', /^[a-f0-9-]{36}$/i, 'Set the real D1 database ID in wrangler.jsonc.');
assert.notEqual(config.d1_databases[0].database_id, '00000000-0000-4000-8000-000000000000', 'Replace the placeholder D1 ID before deploying.');
assert.ok(config.r2_buckets?.[0]?.bucket_name, 'Set the R2 bucket name in wrangler.jsonc.');
function wrangler(args) {
  const result = spawnSync(process.execPath, ['./node_modules/wrangler/bin/wrangler.js', ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!process.argv.includes('--migrate-only')) {
  const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
  assert.equal(built.d1_databases[0].database_id, config.d1_databases[0].database_id, 'Configuration changed: run npm run build again.');
  assert.equal(built.r2_buckets[0].bucket_name, config.r2_buckets[0].bucket_name, 'Configuration changed: run npm run build again.');
  assert.equal(built.account_id, config.account_id, 'Account changed: run npm run build again.');
  assert.equal(built.name, config.name, 'Worker name changed: run npm run build again.');
}
wrangler(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.jsonc']);
if (!process.argv.includes('--migrate-only')) wrangler(['deploy', '--config', 'dist/server/wrangler.json']);
