const $ = id => document.getElementById(id);
const labels = '28 30 32 34 SS S M L XL 2XL 3XL 4XL 5XL 6XL 7XL 8XL 9XL'.split(' ');
const lengths = [19,21,23,24,25,26,27,28,29,30,31,31,32,33,33,33,33];
const extra = size => Math.max(0,labels.indexOf(size)-8)*20;
let cfg = {}, requestId = crypto.randomUUID();
const order = $('order'), fields = order.elements;
labels.forEach((s,i)=>$('sizes').insertAdjacentHTML('beforeend','<tr><td>'+s+'</td><td>'+(28+2*i)+'</td><td>'+lengths[i]+'</td><td>'+extra(s)+'</td></tr>'));
async function api(data) {
  if (!API_URL) throw Error('ยังไม่ได้เชื่อมต่อระบบรับจอง');
  const r = await fetch(API_URL,{method:'POST',body:JSON.stringify(data),redirect:'follow'});
  const v = await r.json();
  if (!v.ok) throw Error(v.error || 'ติดต่อระบบไม่สำเร็จ');
  return v;
}
function addItem(){
  const row=document.createElement('div');row.className='item';
  row.innerHTML='<label>ไซส์<select class="size">'+labels.map(s=>'<option>'+s+'</option>').join('')+'</select></label><label>จำนวนตัว<input class="qty" type="number" min="1" max="100" value="1" required></label><button type="button">ลบรายการ</button>';
  row.querySelector('button').onclick=()=>{if($('items').children.length>1){row.remove();render()}};
  $('items').append(row);render();
}
function items(){return [...document.querySelectorAll('.item')].map(r=>({size:r.querySelector('.size').value,qty:Number(r.querySelector('.qty').value)}));}
function render(){
  const rows=items(), mail=fields.delivery.value==='mail';
  const n=rows.reduce((a,r)=>a+r.qty,0), ship=mail?n*50:0;
  const mods=rows.reduce((a,r)=>a+r.qty*extra(r.size),0);
  $('addr').hidden=!mail;fields.address.required=mail;
  $('bill').textContent='จำนวนเสื้อ '+n+' ตัว\nค่าเสื้อ '+(cfg.ready?n*cfg.base+' บาท':'—')+'\nค่าไซส์พิเศษ '+(Number.isFinite(mods)?mods+' บาท':'—')+'\nค่าจัดส่ง '+ship+' บาท\nยอดที่ต้องโอน '+(cfg.ready?(n*cfg.base+mods+ship)+' บาท':'—');
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
 const r=await api({...data,action:'order',requestId,items:items(),mime:file.type,slip:await encode(file)});
 $('msg').textContent='รับใบจองแล้ว โปรดเก็บรหัสติดตามส่วนตัว '+r.token;
 $('lookup').elements.token.value=r.token;requestId=crypto.randomUUID();order.reset();$('items').replaceChildren();addItem();
}catch(err){$('msg').textContent=err.message}finally{$('send').disabled=!cfg.ready}};
$('lookup').onsubmit=async e=>{e.preventDefault();try{const r=await api({action:'track',token:e.target.elements.token.value.trim()});$('result').textContent=[r.payment,r.fulfillment,r.notice,r.tracking].filter(Boolean).join('\n')}catch(err){$('result').textContent=err.message}};
