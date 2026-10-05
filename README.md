# Mint · ระบบสั่งหมาล่า
เว็บเดียว: หน้าร้าน / เมนูแบบ 3D coverflow / ตะกร้า / PromptPay และสลิป / สถานะออเดอร์ / หลังบ้าน / สต็อก / เมนู / ยอดขาย
## เริ่มใช้งานบนเครื่อง
ต้องมี Node.js >=22.13, Bun และ Git
```powershell
npm ci
Copy-Item .env.example .dev.vars
# ใน .dev.vars ตั้ง ADMIN_EMAIL=seedy@sites.test สำหรับพรีวิวในเครื่องเท่านั้น
bun run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clear_red_shift.sql
bun run dev
```
เปิด URL ที่แสดงใน terminal (ปกติ http://127.0.0.1:5173) และเข้า /admin เพื่อใช้การลงชื่อเข้าใช้จำลองของ Sites ในเครื่อง
ระบบจริงตรวจบัญชีเจ้าของร้านจาก ADMIN_EMAIL ซึ่งเก็บเป็น secret ฝั่งโฮสต์ ไม่ใช้บัญชีจำลอง
ถ้า npm.cmd บน Windows ใช้งานไม่ได้ ใช้ `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" ci`
## ก่อนเปิดขาย
- /admin/settings: ชื่อร้าน, PromptPay 10 หรือ 13 หลัก, ชื่อบัญชีผู้รับ, เปิด/ปิดรับออเดอร์
- /admin/menu: เปลี่ยนเมนูตัวอย่าง ราคา ภาพ และสถานะขาย
- /admin/stock: ปรับจำนวนคงเหลือและดูประวัติ
- /admin/orders: ตรวจสลิปเทียบกับรายการเงินจริง แล้วรับออเดอร์ → เริ่มย่าง → พร้อมรับ → ส่งมอบ
QR มียอดจากราคาที่เซิร์ฟเวอร์คำนวณ ไม่มีการตรวจสลิปหรือรับเงินอัตโนมัติ
ลูกค้าที่ส่งสลิปแล้วไม่สามารถยกเลิกเองได้ รายการคืนเงินหลังโอนต้องจัดการกับร้านโดยตรง
## ข้อมูลและความถูกต้อง
D1 เก็บเมนู การตั้งค่า ออเดอร์ รายการสินค้า และประวัติสต็อก R2 เก็บรูปเมนูและสลิป
ตะกร้าใน browser เป็นร่างชั่วคราวเท่านั้น ออเดอร์และสต็อกจริงอยู่ในฐานข้อมูล
การสร้างออเดอร์และหักสต็อกทำใน transaction พร้อม trigger ป้องกันการขายเกินสต็อก การยกเลิกคืนจำนวนครั้งเดียว
ออเดอร์ยังไม่ส่งสลิปหมดเวลาภายใน 15 นาที การคืนสต็อกทำเมื่อมีคำขอถัดไป ไม่มี scheduled job
สลิปต้องเป็น JPG/PNG ไม่เกิน 5 MB อ่านได้เฉพาะเจ้าของร้าน ออเดอร์ลูกค้าอ่านได้เฉพาะ session ของผู้สั่ง
หลังบ้านและหน้าสถานะ polling ทุก 5 วินาที เมนู polling ทุก 8 วินาที
## ทดสอบ
หลังเปิด dev server และใช้ .dev.vars ตามตัวอย่าง:
```powershell
node node_modules/typescript/bin/tsc --noEmit
node tests/smoke.mjs
```
25 checks ครอบคลุมเงิน สต็อก concurrent order การ retry expiry cancel upload สิทธิ์ และ order lifecycle
Smoke test ทำงานเฉพาะ localhost ตั้งบัญชีรับเงินทดสอบชั่วคราวแล้วคืนค่าเดิม และลบเฉพาะข้อมูลทดสอบในฐานข้อมูล local
## โฮสต์
ใช้ Sites + Cloudflare Worker/D1/R2 โดย .openai/hosting.json เก็บ identity และ logical bindings เท่านั้น
เว็บเผยแพร่แบบส่วนตัวให้เจ้าของตรวจสอบก่อนเปิดให้ลูกค้าใช้ การแชร์สู่สาธารณะต้องเปลี่ยนสิทธิ์ที่ Sites
ซอร์สอยู่ใน Git repository เดียว การเชื่อม GitHub และ deployment CI ต้องผูกบัญชีผู้ให้บริการเพิ่มเติม; ไม่ได้สร้าง GitHub repo หรืออ้างว่า CI เชื่อมแล้ว
## ภาพตัวอย่าง
ใช้ built-in ImageGen (3 ภาพ ไม่มีการสร้างซ้ำ) สามารถแทนที่ด้วยภาพจริงในหลังบ้าน
- public/images/mala-hero.png: photorealistic grilled Thai mala bamboo skewer assortment of pork belly, sausages and mushrooms, chili/cumin/sesame seasoning, charcoal background, warm orange food lighting, square, no text/logos.
- public/images/pork-belly.png: photorealistic grilled mala pork belly skewers on dark matte plate, warm orange lighting, square, no text/logos.
- public/images/bacon-enoki.png: photorealistic grilled bacon-wrapped enoki mushroom mala skewers on dark background, warm orange lighting, square, no text/logos.
ภาพสินค้าเริ่มต้นเป็นภาพประกอบตัวอย่าง และบางเมนูใช้ภาพรวมเดียวกัน
