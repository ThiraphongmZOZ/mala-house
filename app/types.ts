export type Product={id:string;name:string;description:string;category:string;price:number;stock:number;active:number;image:string;position:number;expectedStock?:number};
export type Settings={name:string;target:string;recipient:string;open:number};
export type Item={product_id:string;name:string;price:number;qty:number};
export type Order={id:string;customer:string;total:number;status:string;payment:string;note:string;spicy:string;created:number;expires:number;target:string;recipient:string;slip:string|null;items:Item[]};
export const money=(n:number)=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(n/100);
export const statusText:Record<string,string>={PENDING:'รอตรวจชำระเงิน',ACCEPTED:'รับออเดอร์แล้ว',COOKING:'กำลังย่าง',READY:'พร้อมรับ',COMPLETED:'รับสินค้าแล้ว',CANCELLED:'ยกเลิกแล้ว'};
export const paymentText:Record<string,string>={UNPAID:'รอชำระเงิน',SUBMITTED:'รอตรวจสลิป',PAID:'ชำระแล้ว',REJECTED:'กรุณาแนบสลิปใหม่'};
