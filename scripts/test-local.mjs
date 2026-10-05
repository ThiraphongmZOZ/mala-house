import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { createPasswordHash, randomToken, digest } from '../lib/admin-password.mjs';
const password=randomToken(),email='mint-test@example.test';
let previous;try{previous=readFileSync('.dev.vars')}catch(error){if(error.code!=='ENOENT')throw error;}
let server;
function command(args){const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,MINT_TEST_PASSWORD:password,MINT_TEST_EMAIL:email,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});if(r.status!==0)throw Error(r.stdout+'\n'+r.stderr);return r.stdout;}
try{
  const active=await fetch('http://127.0.0.1:5173').catch(()=>null);
  if(active)throw Error('Stop the server on port 5173 before running the isolated test.');
  writeFileSync('.dev.vars',`ADMIN_EMAIL=${email}\nADMIN_PASSWORD_HASH=${await createPasswordHash(password)}\n`,{mode:0o600});
  command(['./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to','.wrangler/mint-cloudflare']);
  command(['./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.jsonc','--persist-to','.wrangler/mint-cloudflare','--command',`DELETE FROM login_limits WHERE id='${await digest('local')}'`]);
  server=spawn(process.execPath,['./node_modules/vinext/dist/cli.js','dev','--port','5173'],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
  let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
  let ready=false;
  for(let i=0;i<60;i++){const r=await fetch('http://127.0.0.1:5173/api/catalog').catch(()=>null);if(r?.ok){ready=true;break;}if(server.exitCode!==null)throw Error(logs);await setTimeout(1000);}
  if(!ready)throw Error('Local test server failed to start.\n'+logs);
  try{process.stdout.write(command(['tests/smoke.mjs']));}catch(error){throw Error(error.message+'\n'+logs);}
}finally{
  if(server){server.kill();await Promise.race([new Promise(resolve=>server.once('exit',resolve)),setTimeout(3000)]);}
  if(previous)writeFileSync('.dev.vars',previous);else{try{unlinkSync('.dev.vars')}catch{}}
}
