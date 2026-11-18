const basic = document.getElementById('qty-basic');
const live = document.getElementById('qty-live');
function validQty(el){
  let n = Number(el.value || 100);
  n = Math.round(n / 100) * 100;
  n = Math.min(100000, Math.max(100, n));
  el.value = n;
  return n;
}
function price(n, rate){return (n / 100 * rate).toLocaleString('ru-RU') + ' ₽';}
function update(){
  document.getElementById('total-basic').textContent = price(validQty(basic), 100);
  document.getElementById('total-live').textContent = price(validQty(live), 300);
}
[basic, live].forEach(el => {
  el.addEventListener('input', () => {
    const rate = el === basic ? 100 : 300;
    const n = Math.max(100, Math.min(100000, Number(el.value || 100)));
    document.getElementById(el === basic ? 'total-basic' : 'total-live').textContent = price(n, rate);
  });
  el.addEventListener('change', update);
});
document.querySelectorAll('.order-btn').forEach(btn => btn.addEventListener('click', () => {
  const channel = document.getElementById(btn.dataset.channel).value.trim();
  const qtyEl = document.getElementById(btn.dataset.qty);
  const result = document.getElementById(btn.dataset.result);
  const rate = Number(btn.dataset.rate);
  const qty = validQty(qtyEl);
  const validLink = /^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\/?$/.test(channel);
  if (!validLink) {
    result.textContent = 'Проверь ссылку. Нужен открытый канал в формате https://t.me/channelname';
    result.classList.add('error');
    return;
  }
  result.classList.remove('error');
  const orderId = 'GM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  result.textContent = `Заказ ${orderId}: ${btn.dataset.type}, ${qty.toLocaleString('ru-RU')} подписчиков для ${channel}. Стоимость: ${price(qty, rate)}. Это предварительный заказ в демо-режиме: данные не отправлены и не сохранены, оплата пока не подключена.`;
}));
update();
