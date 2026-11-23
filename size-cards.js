let itemSequence = 0;

function addItem() {
  const group = 'shirt-size-' + (++itemSequence);
  const row = document.createElement('fieldset');
  row.className = 'item size-item';
  row.innerHTML = '<legend>เลือกไซส์เสื้อ</legend><div class="size-options"></div><div class="quantity-bar"><label>จำนวนตัว<input class="qty" type="number" inputmode="numeric" min="1" max="100" value="1" required></label><button type="button" class="remove-size">ลบรายการ</button></div>';
  const choices = row.querySelector('.size-options');
  for (const size of labels) {
    const label = document.createElement('label');
    label.className = 'size-choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = group;
    radio.value = size;
    radio.checked = size === labels[0];
    const face = document.createElement('span');
    const title = document.createElement('b');
    const price = document.createElement('small');
    title.textContent = size;
    const fee = extra(size);
    price.textContent = fee ? '+' + fee + ' ฿' : 'ราคาปกติ';
    face.append(title,price);
    label.append(radio,face);
    choices.append(label);
  }
  const qty = row.querySelector('.qty');
  const stepper = document.createElement('div');
  stepper.className = 'stepper';
  const quantityLabel = qty.parentNode;
  qty.id = group + '-qty';
  quantityLabel.htmlFor = qty.id;
  quantityLabel.after(stepper);
  for (const [step, symbol, name] of [[-1,'−','ลดจำนวน'],[1,'+','เพิ่มจำนวน']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = symbol;
    button.setAttribute('aria-label', name);
    button.onclick = () => {
      qty.value = Math.max(1, Math.min(100, (Number(qty.value)||0) + step));
      render();
    };
    stepper.append(button);
    if (step === -1) stepper.append(qty);
  }
  const list = $('items');
  row.querySelector('.remove-size').onclick = () => {
    if (list.children.length <= 1) return;
    row.remove();
    list.firstElementChild.querySelector('.remove-size').disabled = list.children.length === 1;
    render();
  };
  list.append(row);
  for (const button of list.querySelectorAll('.remove-size')) button.disabled = list.children.length === 1;
  render();
}

function items() {
  return [...$('items').children].map(row => ({
    size: row.querySelector('input[type=radio]:checked').value,
    qty: Number(row.querySelector('.qty').value)
  }));
}
