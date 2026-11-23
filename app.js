const $ = id => document.getElementById(id);
const labels = '28 30 32 34 SS S M L XL 2XL 3XL 4XL 5XL 6XL 7XL 8XL 9XL'.split(' ');
const lengths = [19,21,23,24,25,26,27,28,29,30,31,31,32,33,33,33,33];
const extra = size => Math.max(0,labels.indexOf(size)-8)*30;
let cfg = {}, requestId = crypto.randomUUID();
const order = $('order'), fields = order.elements;
labels.forEach((s,i)=>$('sizes').insertAdjacentHTML('beforeend','<tr><td>'+s+'</td><td>'+(28+2*i)+'</td><td>'+lengths[i]+'</td><td>'+extra(s)+'</td></tr>'));

function render(){
  const rows=items(), mail=fields.delivery.value==='mail';
  const n=rows.reduce((a,r)=>a+r.qty,0), ship=mail?n*50:0;
  const mods=rows.reduce((a,r)=>a+r.qty*extra(r.size),0);
  $('addr').hidden=!mail;fields.address.required=mail;
  const base=cfg.ready?Math.round(n*cfg.base*100)/100:null;
  const total=base===null?null:Math.round((base+mods+ship)*100)/100;
  fields.amount.value=total===null?'':total.toFixed(2);
  const money=value=>value===null?'—':value.toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท';
  $('bill-base').textContent=money(base);
  $('bill-count').textContent=n+' ตัว';
  $('bill-extra').textContent=money(mods);
  $('bill-ship').textContent=money(ship);
  $('bill-total').textContent=money(total);
}
$('add').onclick=addItem;order.oninput=render;addItem();
async function init(){try{
 cfg=await api({action:'config'});$('bank').textContent=[cfg.bank,cfg.holder,cfg.account].filter(Boolean).join('\n')||'รอข้อมูลบัญชีจากโรงเรียน';
 if(cfg.qr){const img=new Image();img.alt='QR Code โอนเงิน';img.src=cfg.qr;$('qr').replaceChildren(img)}
 $('send').disabled=!cfg.ready;render();
}catch(e){$('msg').textContent=e.message}
if(!cfg.ready)$('msg').textContent='ยังไม่เปิดรับจอง · อยู่ระหว่างเตรียมข้อมูลการชำระเงิน';}
init();
function encode(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('อ่านสลิปไม่ได้'));reader.readAsDataURL(file)});}
order.onsubmit=async e=>{e.preventDefault();$('send').disabled=true;try{
 const file=fields.slip.files[0];if(file.size>3*1024*1024)throw Error('กรุณาเลือกไฟล์ไม่เกิน 3 MB');
 const data=Object.fromEntries(new FormData(order));delete data.slip;
 $('msg').textContent='กำลังส่งใบจอง…';
 const booked=items();const r=await api({...data,action:'order',requestId,items:booked,mime:file.type,slip:await encode(file)});
 $('msg').textContent='รับใบจองแล้ว โปรดเก็บรหัสติดตามส่วนตัว '+r.token;
 $('lookup').elements.token.value=r.token;requestId=crypto.randomUUID();order.reset();$('items').replaceChildren();addItem();showReceipt(r.token,booked,data.delivery,data.amount,false);
}catch(err){$('msg').textContent=err.message}finally{$('send').disabled=!cfg.ready}};
function statusLine(label, value, tone){
 const card=document.createElement('div');
 card.className='status-line '+tone;
 const title=document.createElement('small'),text=document.createElement('strong');
 title.textContent=label;text.textContent=value;card.append(title,text);
 return card;
}
function displayTracking(result){
 const paid=result.payment==='ชำระแล้ว';
 const correction=result.payment==='ต้องแก้ไข';
 const paymentText=paid?'ยืนยันการชำระเงินแล้ว':correction?'ต้องแก้ไขข้อมูลการชำระเงิน':result.payment==='รอตรวจสอบ'?'รอเจ้าหน้าที่ตรวจสลิป':result.payment||'รอข้อมูล';
 const lines=[
   statusLine('สถานะการชำระเงิน',paymentText,paid?'verified':correction?'correction':'pending'),
   statusLine('สถานะการรับเสื้อ / จัดส่ง',result.fulfillment==='รอประกาศ'?'รอโรงเรียนแจ้งพร้อมรับเสื้อ':result.fulfillment||'รอข้อมูล','delivery')
 ];
 if(result.notice)lines.push(statusLine('กำหนดการและจุดรับเสื้อ',result.notice,'notice'));
 if(result.tracking)lines.push(statusLine('เลขพัสดุ',String(result.tracking).replace(/^เลขพัสดุ\s*/,''),'notice'));
 $('result').replaceChildren(...lines);
}
$('lookup').oninput=()=>$('result').replaceChildren();
$('lookup').onsubmit=async e=>{
 e.preventDefault();
 const f=e.currentTarget;
 $('result').replaceChildren();
 try{displayTracking(await api({action:'track',phone:f.elements.phone.value,token:f.elements.token.value.trim()}))}
 catch(err){$('result').replaceChildren(statusLine('ตรวจสอบใบจอง',err.message,'correction'))}
};

const scanCode=new URLSearchParams(location.hash.slice(1)).get('booking');
if(scanCode && /^[a-f0-9-]{11,36}$/i.test(scanCode)){
 $('lookup').elements.token.value=scanCode;
 $('track').scrollIntoView();$('lookup').elements.phone.focus({preventScroll:true});
}
