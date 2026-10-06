Production: https://mint-mala.mint-thiraphong.workers.dev
Admin: https://mint-mala.mint-thiraphong.workers.dev/admin/login

# Mint · ระบบสั่งหมาล่า
เว็บเดียว: หน้าร้าน / เมนู 3D coverflow / ตะกร้า / PromptPay และสลิป / ออเดอร์ / หลังบ้าน / สต็อก / ยอดขาย
ใช้ Cloudflare Workers + D1 (SQLite) โดย deploy ตรงบนบัญชี Cloudflare ของเจ้าของร้าน

## เริ่มใช้งานบนเครื่อง
ต้องมี Node.js >=22.13 และ Git (ใช้ Bun รัน scripts แทน npm ได้)
```powershell
npm ci
npm run db:migrate:local
npm run admin:setup:local
npm run dev
```
เปิด http://127.0.0.1:5173/admin/login ล็อกอินด้วยอีเมลและรหัสผ่านที่ตั้งไว้
คำสั่งตั้งรหัสผ่านรับข้อมูลใน terminal แบบไม่แสดงรหัส และเก็บเฉพาะ salted PBKDF2 hash ใน .dev.vars ที่ไม่ส่งขึ้น Git
ใช้รหัสผ่านหรือ passphrase 20–200 ตัวอักษร บัญชีเจ้าของร้านมีหนึ่งบัญชีต่อร้าน
Session อยู่ใน D1 อายุ 8 ชั่วโมง คุกกี้ HttpOnly, SameSite=Strict และ Secure เมื่อใช้ HTTPS
ออกจากระบบแล้ว session ใช้ซ้ำไม่ได้ เปลี่ยนอีเมลหรือรหัสผ่านแล้ว session เดิมใช้ไม่ได้เช่นกัน
จำกัดการลองเข้าสู่ระบบ 10 ครั้งต่อ IP ต่อ 15 นาที และตรวจ Origin สำหรับ login/logout
ถ้า npm.cmd บน Windows ใช้งานไม่ได้ ให้ใช้ Node เรียก npm CLI โดยตรง: node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build

## ก่อนเปิดขาย
- /admin/settings: ชื่อร้าน, PromptPay 10 หรือ 13 หลัก, ชื่อบัญชีผู้รับ, เปิด/ปิดรับออเดอร์
- /admin/menu: เปลี่ยนเมนูตัวอย่าง ราคา ภาพ และสถานะขาย
- /admin/stock: ปรับจำนวนคงเหลือและดูประวัติ
- /admin/orders: ตรวจสลิปเทียบกับรายการเงินจริง แล้วรับออเดอร์ → เริ่มย่าง → พร้อมรับ → ส่งมอบ
QR มียอดจากราคาที่เซิร์ฟเวอร์คำนวณ ไม่มีการตรวจสลิปหรือรับเงินอัตโนมัติ
ลูกค้าที่ส่งสลิปแล้วไม่สามารถยกเลิกเองได้ รายการคืนเงินหลังโอนต้องจัดการกับร้านโดยตรง
## ข้อมูลและความถูกต้อง
D1 เก็บเมนู การตั้งค่า ออเดอร์ รายการสินค้า และประวัติสต็อก รวมถึงรูปเมนูและสลิปขนาดเล็ก
ตะกร้าใน browser เป็นร่างชั่วคราวเท่านั้น ออเดอร์และสต็อกจริงอยู่ในฐานข้อมูล
การสร้างออเดอร์และหักสต็อกทำใน transaction พร้อม trigger ป้องกันการขายเกินสต็อก การยกเลิกคืนจำนวนครั้งเดียว
ออเดอร์ยังไม่ส่งสลิปหมดเวลาภายใน 15 นาที การคืนสต็อกทำเมื่อมีคำขอถัดไป ไม่มี scheduled job
สลิปต้องเป็น JPG/PNG ไม่เกิน 500 KB (หน้าเว็บบีบอัดภาพต้นฉบับไม่เกิน 10 MB ให้ก่อนอัปโหลด) อ่านได้เฉพาะเจ้าของร้าน ออเดอร์ลูกค้าอ่านได้เฉพาะ session ของผู้สั่ง
หลังบ้านและหน้าสถานะ polling ทุก 5 วินาที เมนู polling ทุก 8 วินาที
## ทดสอบ
```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run test:auth
npm run test:local
npm run build
```
หยุด dev server ที่ port 5173 ก่อน test:local คำสั่งนี้สร้างบัญชีทดสอบแบบสุ่มชั่วคราว เปิดเซิร์ฟเวอร์ แล้วคืน .dev.vars เดิมเมื่อจบ
ทดสอบออเดอร์ เงิน สต็อก concurrent order, retry, expiry, cancel, QR, ไฟล์ D1, login, CSRF, ปลอม header/cookie, logout และ rate limit
ฐานข้อมูล local อยู่แยกใน .wrangler/mint-cloudflare ลบเฉพาะรายการทดสอบและคืนการตั้งค่าร้าน

## Deploy บน Cloudflare
บัญชีและ Database ID ใน wrangler.jsonc เชื่อมกับฐานข้อมูล mint-mala-db ที่สร้างให้แล้ว
ล็อกอิน Wrangler ครั้งแรกต้องเจ้าของบัญชีตรวจและยอมรับสิทธิ์ OAuth
```powershell
npx wrangler login
# ฐานข้อมูล D1 สร้างแล้ว ไม่ต้องรัน d1 create ซ้ำ
npm run db:migrate:remote
npm run build
npm run deploy
npm run admin:setup:remote
```
admin:setup:remote เก็บ ADMIN_EMAIL และ ADMIN_PASSWORD_HASH เป็น Cloudflare runtime secrets โดยไม่ใส่รหัสผ่านใน shell arguments หรือ Git
ก่อนตั้ง secrets หน้าแอดมินจะปิดการล็อกอินไว้ สามารถรัน setup ซ้ำเพื่อเปลี่ยนรหัสผ่านได้
คำสั่ง deploy ตรวจ Database ID และความตรงกันของ config กับ build ก่อนใช้ migration แบบเพิ่มต่อ แล้วจึงอัปโหลด Worker และ assets
ไฟล์ migration ที่ใช้งานแล้วต้องไม่แก้ ให้เพิ่มไฟล์ใหม่ผ่าน npm run db:generate
ชื่อ Worker ต้องตรงกับชื่อที่ตั้งใน Cloudflare คือ mint-mala

## Auto Deploy จาก GitHub
Repository: https://github.com/ThiraphongmZOZ/mala-house — branch main, root directory ว่างหรือ /
Workers & Pages → Create application → Import a repository → เลือก mala-house
- Build command: npm run build
- Deploy command: npm run deploy
- Node version: 22.13 หรือใหม่กว่า
- API token สำหรับ Builds ต้องมี Workers Scripts Edit และ D1 Edit สำหรับบัญชีนี้ เพราะ deploy ใช้ D1 migrations ด้วย
- Runtime secrets ตั้งที่ Worker → Settings → Variables & Secrets หรือ npm run admin:setup:remote; Build secrets เป็นคนละส่วน
ปิด deployment ของ branch อื่นไว้ก่อน เพื่อไม่ให้ preview ใช้ฐานข้อมูลร้านจริงร่วมกับ production
หลังเชื่อมแล้ว push เข้า main จะ deploy โดย Cloudflare Workers Builds; การเพิ่มไฟล์นี้อย่างเดียวไม่ได้เปิด CI บนบัญชีให้โดยอัตโนมัติ

## ย้ายข้อมูลจากเว็บเดิม
ฐานข้อมูล Cloudflare ของคุณเป็นฐานข้อมูลใหม่ เมนูตัวอย่างจะถูกเติมเมื่อเปิด API ครั้งแรก
ถ้ามีออเดอร์ เมนูหรือการตั้งค่าจริงใน Sites ต้อง export/import D1 และนำไฟล์เดิมเข้า uploads ใน D1 โดยคงชื่อ key เดิมก่อนเปลี่ยน URL ร้าน
ไม่ควรให้ลูกค้าสั่งพร้อมกันสองโฮสต์ระหว่างย้าย และ session ลูกค้ากับเจ้าของร้านเดิมจะไม่ย้ายตาม
.openai/hosting.json และไฟล์ช่วย Sites เก็บไว้เป็นข้อมูลอ้างอิงของโฮสต์เดิม ไม่ได้ใช้ในการ build/deploy ตรงนี้

## ภาพตัวอย่าง
ใช้ built-in ImageGen (3 ภาพ ไม่มีการสร้างซ้ำ) สามารถแทนที่ด้วยภาพจริงในหลังบ้าน
- public/images/mala-hero.png: photorealistic grilled Thai mala bamboo skewer assortment of pork belly, sausages and mushrooms, chili/cumin/sesame seasoning, charcoal background, warm orange food lighting, square, no text/logos.
- public/images/pork-belly.png: photorealistic grilled mala pork belly skewers on dark matte plate, warm orange lighting, square, no text/logos.
- public/images/bacon-enoki.png: photorealistic grilled bacon-wrapped enoki mushroom mala skewers on dark background, warm orange lighting, square, no text/logos.
ภาพสินค้าเริ่มต้นเป็นภาพประกอบตัวอย่าง และบางเมนูใช้ภาพรวมเดียวกัน

รูปอัปโหลดและข้อมูลใช้พื้นที่ D1 ร่วมกัน ควรติดตามขนาดฐานข้อมูล และย้ายไฟล์ไป object storage เมื่อพื้นที่ใกล้เต็ม
