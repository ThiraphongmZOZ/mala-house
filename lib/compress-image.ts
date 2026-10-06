export async function compressImage(file: File): Promise<File> {
  if (!['image/jpeg','image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('เลือกภาพ JPG หรือ PNG ไม่เกิน 10 MB');
  if (file.size <= 500000) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('อุปกรณ์นี้ไม่รองรับการบีบอัดภาพ');
    for (const maxSide of [1600,1200,900]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for (const quality of [0.82,0.65]) {
        const blob = await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if (blob && blob.size <= 500000) return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
      }
    }
    throw new Error('ภาพยังใหญ่เกิน 500 KB กรุณาเลือกภาพขนาดเล็กลง');
  } finally { bitmap.close(); }
}
