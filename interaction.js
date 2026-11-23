const loading = document.createElement('dialog');
loading.className='loading';
loading.setAttribute('aria-label','กำลังทำรายการ');
loading.innerHTML='<i aria-hidden="true"></i><strong role="status"></strong>';
loading.oncancel=e=>e.preventDefault();
document.body.append(loading);
let activeRequests=0;
async function api(data){
 if(!API_URL)throw Error('ยังไม่ได้เชื่อมต่อระบบรับจอง');
 const messages={config:'กำลังโหลดข้อมูลเสื้อ',order:'กำลังบันทึกใบจองและสลิป',cash:'กำลังบันทึกรับเงินสด',login:'กำลังเข้าสู่ระบบ',dashboard:'กำลังโหลดรายการจอง',review:'กำลังบันทึกผลตรวจ',slip:'กำลังเปิดสลิป',track:'กำลังค้นหาใบจอง',logout:'กำลังออกจากระบบ'};
 loading.querySelector('strong').textContent=messages[data.action]||'กำลังทำรายการ';
 if(!activeRequests++)loading.showModal();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90000);
 try{
  const res=await fetch(API_URL,{method:'POST',body:JSON.stringify(data),signal:controller.signal});
  if(!res.ok)throw Error('ติดต่อระบบไม่ได้ กรุณาลองอีกครั้ง');
  const value=await res.json();if(!value.ok)throw Error(value.error||'ทำรายการไม่สำเร็จ');
  return value;
 }catch(e){if(e.name==='AbortError')throw Error('หมดเวลารอการตอบกลับ กรุณาลองอีกครั้ง');throw e}
 finally{clearTimeout(timeout);if(!--activeRequests)loading.close()}
}
function showReceipt(token,items,delivery,amount,cash){
 const card=document.createElement('dialog');card.className='receipt';card.setAttribute('aria-label','บัตรยืนยันการจอง');
 card.innerHTML='<small>โรงเรียนสยามกลการ 4</small><h2>บัตรยืนยันการจองเสื้อ</h2><div class="ticketCode"></div><div class="ticketItems"></div><div class="ticketPayment"></div><canvas aria-label="QR Code สำหรับติดตามใบจอง"></canvas><b>แคปหน้าจอนี้เก็บไว้</b><p>สแกน QR แล้วกรอกเบอร์โทรที่ใช้จองเพื่อตรวจสถานะ</p><button>ปิดบัตร</button>';
 card.querySelector('.ticketCode').textContent=token;
 card.querySelector('.ticketItems').textContent=items.map(r=>r.size+' × '+r.qty).join('  ·  ')+'  |  '+(delivery==='mail'?'ส่งไปรษณีย์':'รับที่โรงเรียน');
 card.querySelector('.ticketPayment').textContent=(cash?'รับเงินสดแล้ว ':'แจ้งโอน ')+Number(amount).toLocaleString('th-TH')+' บาท'+(cash?'':' · รอตรวจสอบ');
 const url=new URL('./',location.href);url.hash=new URLSearchParams({booking:token}).toString();
 const qr=new BookingQR(0,0);qr.addData(url.href);qr.make();
 const canvas=card.querySelector('canvas'),scale=6;
 canvas.width=canvas.height=(qr.getModuleCount()+8)*scale;const ctx=canvas.getContext('2d');
 ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#082820';
 for(let y=0;y<qr.getModuleCount();y++)for(let x=0;x<qr.getModuleCount();x++)if(qr.isDark(y,x))ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);
 document.body.append(card);card.querySelector('button').onclick=()=>card.close();card.onclose=()=>card.remove();card.showModal();
}
