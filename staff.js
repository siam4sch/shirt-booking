const $ = id => document.getElementById(id);
const labels = '28 30 32 34 SS S M L XL 2XL 3XL 4XL 5XL 6XL 7XL 8XL 9XL'.split(' ');
const lengths = [19,21,23,24,25,26,27,28,29,30,31,31,32,33,33,33,33];
const extra = size => Math.max(0,labels.indexOf(size)-8)*20;
let cfg = {}, requestId = crypto.randomUUID();
const order = $('order'), fields = order.elements;
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


async function api(data) {
  if (!API_URL) throw Error('ยังไม่ได้เชื่อมต่อระบบรับจอง');
  const r = await fetch(API_URL,{method:'POST',body:JSON.stringify(data),redirect:'follow'});
  const v = await r.json();
  if (!v.ok) throw Error(v.error || 'ติดต่อระบบไม่สำเร็จ');
  return v;
}
let session='';
function lockPage(){session='';cfg={};$('bookings').replaceChildren();page('queue');$('panel').hidden=true;$('signin').hidden=false;$('totals').replaceChildren();order.reset();$('items').replaceChildren();addItem();$('msg').textContent='';requestId=crypto.randomUUID()}
async function dashboard(){
 cfg=await api({action:'dashboard',session});
 $('totals').replaceChildren();
 for(const values of cfg.counts){const row=$('totals').insertRow();values.forEach(v=>row.insertCell().textContent=v)}
 drawOrders();$('sheet').href=cfg.sheet;$('send').disabled=!cfg.ready;render();
}
$('login').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{
 const r=await api({action:'login',user:f.elements.user.value,password:f.elements.password.value});session=r.session;f.reset();await dashboard();
 $('panel').hidden=false;$('signin').hidden=true;$('status').textContent='';
}catch(err){lockPage();$('status').textContent=err.message}finally{b.disabled=false}};
$('logout').onclick=async()=>{const old=session;lockPage();try{await api({action:'logout',session:old})}catch(err){$('status').textContent=err.message}};
order.onsubmit=async e=>{e.preventDefault();$('send').disabled=true;
 try{const d={...Object.fromEntries(new FormData(order)),requestId,items:items()};
 const r=await api({...d,action:'cash',session});requestId=crypto.randomUUID();order.reset();$('items').replaceChildren();addItem();
 $('msg').textContent='บันทึกเงินสดแล้ว รหัส '+r.token;await dashboard();
 }catch(err){if(err.message==='กรุณาเข้าสู่ระบบใหม่'){lockPage();$('status').textContent=err.message}else $('msg').textContent=err.message}
 finally{$('send').disabled=!cfg.ready}};
function page(id){
 for(const name of ['queue','report','order'])$(name).hidden=name!==id;
 document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===id)));
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));page('queue');
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
function drawOrders(){
 const q=$('search').value.trim().toLowerCase(),state=$('filter').value,list=$('bookings');
 list.replaceChildren();
 const rows=(cfg.orders||[]).filter(r=>(!state||r.payment===state)&&[r.id,r.name,r.phone].join(' ').toLowerCase().includes(q));
 if(!rows.length)list.append(el('p','ไม่พบรายการจองตามที่เลือก'));
 for(const r of rows){
  const box=el('details','');box.className='booking';
  const title=el('summary',''),badge=el('span',r.payment);badge.className='badge';
  title.append(el('strong',r.name+' · '+r.count+' ตัว'),el('span',r.total+' บาท'),badge);box.append(title);
  box.ontoggle=()=>{if(box.open&&!box.dataset.loaded){box.dataset.loaded='1';orderDetail(box,r)}};
  list.append(box);
 }
}
function orderDetail(box,r){
 const fields=el('dl','');
 const data=[['รหัสใบจอง',r.id],['เบอร์ติดต่อ',r.phone],['รายการเสื้อ',r.items.map(i=>i.size+' × '+i.qty).join(', ')],['วิธีรับ',r.delivery==='mail'?'ไปรษณีย์':'รับที่โรงเรียน'],['ที่อยู่',r.address||'—'],['ค่าจัดส่ง',r.ship+' บาท'],['ยอดที่ต้องชำระ',r.total+' บาท'],['ยอดที่แจ้ง',r.amount+' บาท · '+r.method],['เวลาชำระ',String(r.paidAt).replace('T',' ')],['สถานะรับเสื้อ',r.fulfillment],['เลขพัสดุ',r.tracking||'—'],['ผลตรวจล่าสุด',[r.reviewer,r.reviewTime,r.note].filter(Boolean).join(' · ')||'—']];
 data.forEach(([k,v])=>fields.append(el('dt',k),el('dd',v)));box.append(fields);
 if(r.method!=='โอน')return;
 const open=el('button','เปิดสลิป'),preview=el('div',''),message=el('p','');preview.className='preview';message.setAttribute('role','status');
 const checkbox=el('input','');checkbox.type='checkbox';checkbox.disabled=true;
 const confirm=el('label','');confirm.append(checkbox,' ตรวจยอดเงินเข้าบัญชีและรายละเอียดสลิปแล้ว');
 const note=el('textarea','');note.placeholder='หมายเหตุ / เหตุผลหากต้องแก้ไข';note.maxLength=500;
 const approve=el('button','ยืนยันชำระแล้ว'),reject=el('button','ต้องแก้ไข');approve.disabled=true;
 checkbox.onchange=()=>approve.disabled=!checkbox.checked;
 open.disabled=!r.hasSlip;open.onclick=async()=>{open.disabled=true;try{
  const f=await api({action:'slip',session,id:r.id}),url='data:'+f.mime+';base64,'+f.data;
  if(['image/png','image/jpeg'].includes(f.mime)){const img=new Image();img.alt='สลิปที่ผู้จองแนบ';img.src=url;preview.replaceChildren(img)}
  else if(f.mime==='application/pdf'){const a=el('a','ดาวน์โหลด PDF เพื่อตรวจสลิป');a.href=url;a.download='slip.pdf';preview.replaceChildren(a)}else throw Error('เปิดไฟล์ชนิดนี้ไม่ได้');
  checkbox.disabled=false;
 }catch(e){message.textContent=e.message;open.disabled=false}};
 async function decide(payment){if(payment==='ต้องแก้ไข'&&!note.value.trim()){message.textContent='กรุณากรอกเหตุผล';return}
 approve.disabled=reject.disabled=true;try{await api({action:'review',session,id:r.id,previous:r.payment,version:r.reviewTime,payment,confirmed:checkbox.checked,note:note.value});await dashboard();$('status').textContent='บันทึกผลตรวจใบจอง '+r.id+' แล้ว'}catch(e){message.textContent=e.message;approve.disabled=!checkbox.checked;reject.disabled=false}}
 approve.onclick=()=>decide('ชำระแล้ว');reject.onclick=()=>decide('ต้องแก้ไข');
 box.append(open,preview,confirm,note,approve,reject,message);
}
$('search').oninput=drawOrders;$('filter').onchange=drawOrders;
$('refresh').onclick=async()=>{try{await dashboard()}catch(e){$('status').textContent=e.message}};
