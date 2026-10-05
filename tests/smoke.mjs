import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const origin=process.env.MINT_TEST_URL??'http://127.0.0.1:5173';
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/,'Run only on a local test instance');
class Client{
 cookie='';
 async request(path,{body,file,method,headers={}}={}){
  const r=await fetch(origin+path,{method:method??(body||file?'POST':'GET'),headers:{...(this.cookie?{cookie:this.cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(body||file?{'x-mint-action':'1'}:{}),...headers},...(body?{body:JSON.stringify(body)}:file?{body:file}:{})});
  const cs=r.headers.getSetCookie();if(cs.length)this.cookie=cs.map(c=>c.split(';')[0]).join('; ');
  return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};
 }
}
const admin=new Client(),guest=new Client(),other=new Client(),testProducts=[],testOrders=[];
const signin=await fetch(origin+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});
admin.cookie=signin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(admin.cookie,'Local mock sign-in cookie');
const initial=(await admin.request('/api/admin/overview')).data;
assert.ok(initial.settings,'Admin sign-in works');
const settings=initial.settings;
let checks=0;function check(value,msg){assert.ok(value,msg);checks++;}
const create=async(client,pid,qty=1)=>{const id=crypto.randomUUID();testOrders.push(id);const r=await client.request('/api/orders',{body:{id,customer:'SMOKE-MINT',note:'Local development check',spicy:'เผ็ดกลาง',total:1,items:[{id:pid,qty,price:1}]}});return {...r,id}};
const product=async(stock)=>{const id=crypto.randomUUID();testProducts.push(id);const r=await admin.request('/api/admin/product',{body:{id,name:'SMOKE-TEST',description:'Temporary local test',category:'ทดสอบ',price:1234,stock,active:1,image:'/images/mala-hero.png',position:999}});assert.equal(r.status,200);return id};
try{
 check((await guest.request('/api/admin/overview')).status===403,'Guest cannot read admin');
 check((await create(guest,'pork')).status===409,'No merchant account means no checkout');
 assert.equal((await admin.request('/api/admin/settings',{body:{name:settings.name,target:'0800000000',recipient:'LOCAL TEST ONLY',open:1}})).status,200);
 const sold=await product(0);check((await create(guest,sold)).status===409,'Sold-out item cannot be ordered');
 const pid=await product(3),o=await create(guest,pid,2);check(o.status===201,'Create order');
 const row=(await guest.request('/api/orders/'+o.id)).data;
 check(row.total===2468,'Server owns pricing and money math');
 check((await other.request('/api/orders/'+o.id)).status===404,'Order belongs to customer cookie');
 check((await guest.request('/api/qr/'+o.id)).data.includes('<svg'),'PromptPay QR generated');
 const duplicate=await guest.request('/api/orders',{body:{id:o.id,customer:'SMOKE-MINT',note:'',spicy:'เผ็ดกลาง',items:[{id:pid,qty:2}]}});
 check(duplicate.status===200,'Retry is idempotent');
 const catalog=(await guest.request('/api/catalog')).data;
 check(catalog.products.find(p=>p.id===pid).stock===1,'Stock deducted exactly once');
 const conflict=await admin.request('/api/admin/product',{body:{...catalog.products.find(p=>p.id===pid),stock:99,expectedStock:3}});
 check(conflict.status===409,'Stale stock edit is rejected');
 check((await guest.request('/api/admin/order/'+o.id,{body:{action:'approve'}})).status===403,'Customer cannot approve payment');
 check((await admin.request('/api/admin/order/'+o.id,{body:{action:'approve'}})).status===409,'No approval before slip');
 const bad=new FormData();bad.append('file',new Blob(['not-an-image'],{type:'image/png'}),'fake.png');
 check((await guest.request('/api/payment/'+o.id,{file:bad})).status===400,'File signature validation');
 const form=new FormData();form.append('file',new Blob([readFileSync('public/images/pork-belly.png')],{type:'image/png'}),'local-test.png');
 const uploadResult=await guest.request('/api/payment/'+o.id,{file:form});check(uploadResult.status===200,'R2 slip upload '+JSON.stringify(uploadResult));
 check((await other.request('/api/slip/'+o.id)).status===403,'Private slips stay private');
 check((await admin.request('/api/slip/'+o.id)).status===200,'Owner can inspect slip');
 check((await admin.request('/api/admin/order/'+o.id,{body:{action:'READY'}})).status===409,'State cannot skip cooking');
 assert.equal((await admin.request('/api/admin/order/'+o.id,{body:{action:'reject'}})).status,200);
 check((await guest.request('/api/orders/'+o.id)).data.payment==='REJECTED','Reject requests new slip');
 const f2=new FormData();f2.append('file',new Blob([readFileSync('public/images/pork-belly.png')],{type:'image/png'}),'local-test.png');
 assert.equal((await guest.request('/api/payment/'+o.id,{file:f2})).status,200);
 for(const action of ['approve','COOKING','READY','COMPLETED'])assert.equal((await admin.request('/api/admin/order/'+o.id,{body:{action}})).status,200);
 check((await guest.request('/api/orders/'+o.id)).data.status==='COMPLETED','Full order lifecycle');
 const cancel=await create(guest,pid,1);assert.equal(cancel.status,201);
 assert.equal((await guest.request('/api/cancel/'+cancel.id,{body:{}})).status,200);
 check((await guest.request('/api/cancel/'+cancel.id,{body:{}})).status===409,'No duplicate stock restoration');
 check((await guest.request('/api/catalog')).data.products.find(p=>p.id===pid).stock===1,'Cancelled stock returned');
 const racePid=await product(2);
 const races=await Promise.all([create(guest,racePid,2),create(other,racePid,2)]);
 check(races.filter(r=>r.status===201).length===1&&races.filter(r=>r.status===409).length===1,'Concurrent orders cannot oversell');
 const winner=races.find(r=>r.status===201),winnerClient=races[0]===winner?guest:other;
 await winnerClient.request('/api/cancel/'+winner.id,{body:{}});
 const expiry=await create(guest,racePid,1);assert.equal(expiry.status,201);
 const cmd="UPDATE orders SET expires=1 WHERE id='"+expiry.id+"'";
 const exec=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',cmd],{encoding:'utf8'});assert.equal(exec.status,0,exec.stderr);
 await guest.request('/api/catalog');
 check((await guest.request('/api/orders/'+expiry.id)).data.status==='CANCELLED','Unpaid reservation expires');
 check((await guest.request('/api/catalog')).data.products.find(p=>p.id===racePid).stock===2,'Expiry returns stock');
 check((await admin.request('/api/admin/product',{body:{...catalog.products.find(p=>p.id===pid),stock:-1,expectedStock:1}})).status===400,'Negative stock rejected');
 console.log('PASS: '+checks+' local checks; orders, money, concurrency, stock, expiry, access, QR, R2 and lifecycle.');
}finally{
 await admin.request('/api/admin/settings',{body:settings});
 const ids=testOrders.map(id=>"'"+id+"'").join(','),pids=testProducts.map(id=>"'"+id+"'").join(',');
 const cleanup="DELETE FROM stock_movements WHERE order_id IN ("+ids+") OR product_id IN ("+pids+"); DELETE FROM order_items WHERE order_id IN ("+ids+"); DELETE FROM orders WHERE id IN ("+ids+"); DELETE FROM products WHERE id IN ("+pids+");";
 const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',cleanup],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}
