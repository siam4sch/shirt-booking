// ใส่ชื่อไฟล์ภาพเสื้อในโฟลเดอร์ docs เช่น 'polo-front.png' หรือเว้นว่างเพื่อใช้โปสเตอร์เดิม
const shirtImageFile = '';
if (shirtImageFile) {
  const image = document.querySelector('.poster img');
  image.addEventListener('load', () => image.parentElement.classList.add('custom-shirt'), {once:true});
  image.onerror = () => {
    image.onerror = null;
    image.onload = null;
    image.src = 'shirt.jpg';
  };
  image.src = shirtImageFile;
  image.alt = 'แบบเสื้อผ้าป่าเพื่อการศึกษา';
}
