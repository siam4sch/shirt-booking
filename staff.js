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
function lockPage(){session='';$('panel').hidden=true;$('signin').hidden=false;$('totals').replaceChildren();order.reset();$('items').replaceChildren();addItem();$('msg').textContent='';requestId=crypto.randomUUID()}
async function dashboard(){
 cfg=await api({action:'dashboard',session});
 $('totals').replaceChildren();
 for(const values of cfg.counts){const row=$('totals').insertRow();values.forEach(v=>row.insertCell().textContent=v)}
 $('sheet').href=cfg.sheet;$('send').disabled=!cfg.ready;render();
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
