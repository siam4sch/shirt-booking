const $ = id => document.getElementById(id);
const labels = '28 30 32 34 SS S M L XL 2XL 3XL 4XL 5XL 6XL 7XL 8XL 9XL'.split(' ');
const lengths = [19,21,23,24,25,26,27,28,29,30,31,31,32,33,33,33,33];
const extra = size => Math.max(0,labels.indexOf(size)-8)*30;
let cfg = {}, requestId = crypto.randomUUID();
const order = $('order'), fields = order.elements;
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



let session='';
function lockPage(){session='';cfg={};$('bookings').replaceChildren();page('queue');$('panel').hidden=true;$('signin').hidden=false;$('totals').replaceChildren();order.reset();$('items').replaceChildren();addItem();$('msg').textContent='';requestId=crypto.randomUUID()}
async function dashboard(){
 cfg=await api({action:'dashboard',session});
 $('totals').replaceChildren();
 for(const values of cfg.counts){const row=$('totals').insertRow();values.forEach(v=>row.insertCell().textContent=v)}
 if(!Array.isArray(cfg.orders))throw Error('กรุณาอัปเดต Apps Script เป็นรุ่นที่รองรับรายการจอง');
 drawMetrics();drawOrders();$('sheet').href=cfg.sheet;$('send').disabled=!cfg.ready;render();
}
$('login').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{
 const r=await api({action:'login',user:f.elements.user.value,password:f.elements.password.value});session=r.session;f.reset();await dashboard();
 $('panel').hidden=false;$('signin').hidden=true;$('status').textContent='';
}catch(err){lockPage();$('status').textContent=err.message}finally{b.disabled=false}};
$('logout').onclick=async()=>{const old=session;lockPage();try{await api({action:'logout',session:old})}catch(err){$('status').textContent=err.message}};
order.onsubmit=async e=>{e.preventDefault();$('send').disabled=true;
 try{const d={...Object.fromEntries(new FormData(order)),requestId,items:items()};
 const r=await api({...d,action:'cash',session});requestId=crypto.randomUUID();order.reset();$('items').replaceChildren();addItem();
 $('msg').textContent='บันทึกเงินสดแล้ว รหัส '+r.token;showReceipt(r.token,d.items,d.delivery,d.amount,true);await dashboard();
 }catch(err){if(err.message==='กรุณาเข้าสู่ระบบใหม่'){lockPage();$('status').textContent=err.message}else $('msg').textContent=err.message}
 finally{$('send').disabled=!cfg.ready}};
function page(id){
 for(const name of ['queue','report','round','order'])$(name).hidden=name!==id;
 document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===id)));
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page(b.dataset.page);if(b.dataset.page==='round')loadRound()});page('queue');
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
function drawOrders(){
 const q=$('search').value.trim().toLowerCase(),state=$('filter').value,list=$('bookings');
 list.replaceChildren();
 const rows=(cfg.orders||[]).filter(r=>(!state||r.payment===state)&&[r.id,r.name,r.phone].join(' ').toLowerCase().includes(q));
 if(!rows.length){const empty=el('div','');empty.className='empty';empty.append(el('strong',cfg.orders.length?'ไม่พบใบจองที่ตรงกับตัวกรอง':'ยังไม่มีใบจอง'),el('p',cfg.orders.length?'ลองเปลี่ยนชื่อ เบอร์โทร หรือสถานะที่ค้นหา':'ใบจองออนไลน์และรายการเงินสดจะปรากฏที่นี่'));list.append(empty)}
 for(const r of rows){
  const box=el('details','');box.className='booking';
  const title=el('summary',''),badge=el('span',r.payment);badge.className='badge';
  title.append(el('strong',r.name),el('small',r.id+' · '+r.count+' ตัว'),el('span',r.total+' บาท'),badge);box.append(title);
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

function drawMetrics(){
 const parent=$('metrics');parent.replaceChildren();
 const rows=cfg.orders;
 for(const [label,state] of [['ใบจองทั้งหมด',''],['ยอดแจ้งโอนรอตรวจ','รอตรวจสอบ'],['ยอดรับชำระแล้ว','ชำระแล้ว']]){
  const selected=state?rows.filter(r=>r.payment===state):rows;
  const button=el('button','');
  button.append(el('span',label));
  if(state){
   const satang=selected.reduce((sum,r)=>sum+Math.round(Number(r.amount)*100),0);
   button.append(el('strong',(satang/100).toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท'),el('small',selected.length+' ใบจอง'));
  }else button.append(el('strong',rows.length.toLocaleString('th-TH')),el('small','ใบจอง'));
  if(state==='ชำระแล้ว'){
   for(const method of ['โอน','เงินสด']){
    const sum=selected.filter(r=>r.method===method).reduce((n,r)=>n+Math.round(Number(r.amount)*100),0);
    button.append(el('small',method+' '+(sum/100).toLocaleString('th-TH')+' บาท'));
   }
  }
  button.onclick=()=>{page('queue');$('filter').value=state;$('search').value='';drawOrders()};
  parent.append(button);
 }
}

let savedRoundDay = '';
async function loadRound(change) {
 const staffSession = session;
 $('round-form').hidden = true;
 $('round-refresh').disabled = true;
 $('round-figures').hidden = true;
 $('round-state').textContent = 'กำลังโหลดข้อมูลรอบ…';
 try {
  const r = await api({...change,action:change ? 'scheduleRound' : 'round',session:staffSession});
  if (session !== staffSession) return;
  savedRoundDay = r.day;
  $('round-form').hidden = r.closed;
  $('round-day').value = r.day;
  $('round-state').textContent = 'ยังไม่ได้กำหนดวันตัดรอบ';
  if (!r.day) return;
  const date = new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'}).format(new Date(r.day+'T12:00:00+07:00'));
  $('round-state').textContent = (r.closed ? 'ตัดยอดแล้ว' : 'ยอดประมาณการ') + ' · นับถึงสิ้นวันที่ ' + date + ' เวลาไทย';
  $('round-qty').textContent = r.quantity+' ตัว';
  $('round-orders').textContent = r.orders+' ใบ';
  $('round-pending').textContent = r.pending+' ตัว';
  $('round-sizes').replaceChildren();
  for (const size of labels) {
   const row = $('round-sizes').insertRow();
   row.insertCell().textContent = size;
   row.insertCell().textContent = r.counts[size];
  }
  $('round-sheet').hidden = !r.url;
  if (r.url) $('round-sheet').href = r.url;
  $('round-figures').hidden = false;
 } catch (err) {
  if (session === staffSession) $('round-state').textContent = err.message;
 } finally { $('round-refresh').disabled = false; }
}
$('round-form').onsubmit = event => {
 event.preventDefault();
 loadRound({day:$('round-day').value,previous:savedRoundDay});
};
$('round-refresh').onclick = () => loadRound();
