const basic = document.getElementById('qty-basic');
const live = document.getElementById('qty-live');

function validQty(el) {
  let n = Number(el.value || 100);
  n = Math.round(n / 100) * 100;
  n = Math.min(100000, Math.max(100, n));
  el.value = n;
  return n;
}

function price(n, rate) {
  return (n / 100 * rate).toLocaleString('ru-RU') + ' ₽';
}

function update() {
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

document.querySelectorAll('.order-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const channel = document.getElementById(btn.dataset.channel).value.trim();
    const qtyEl = document.getElementById(btn.dataset.qty);
    const result = document.getElementById(btn.dataset.result);
    const qty = validQty(qtyEl);
    const validLink = /^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_]{5,32}\/?$/.test(channel);

    if (!validLink) {
      result.textContent = 'Проверь ссылку. Нужен открытый канал в формате https://t.me/channelname';
      result.classList.add('error');
      return;
    }

    result.classList.remove('error');
    result.textContent = 'Создаём заказ…';
    btn.disabled = true;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl: channel,
          tariff: btn.dataset.rate === '100' ? 'ordinary' : 'live',
          quantity: qty
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось создать заказ. Попробуй ещё раз.');
      }

      result.textContent = `Заказ #${data.orderNumber} создан. Сумма: ${price(qty, Number(btn.dataset.rate))}. Статус: Новый. Оплата пока не подключена — дождись подтверждения менеджера.`;
    } catch (error) {
      result.textContent = error.message || 'Ошибка соединения. Попробуй ещё раз.';
      result.classList.add('error');
    } finally {
      btn.disabled = false;
    }
  });
});

update();
