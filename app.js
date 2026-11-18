const serviceSelect = document.getElementById('service');
document.querySelectorAll('.choose-service').forEach(button => {
  button.addEventListener('click', () => {
    serviceSelect.value = button.dataset.service;
    document.getElementById('order').scrollIntoView({behavior:'smooth'});
  });
});
document.getElementById('orderForm').addEventListener('submit', event => {
  event.preventDefault();
  const channel = document.getElementById('channel').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const result = document.getElementById('result');
  if (!/^https:\/\/t\.me\/[A-Za-z0-9_]+\/?$/.test(channel)) {
    result.textContent = 'Укажи корректную публичную ссылку вида https://t.me/channelname';
    return;
  }
  const id = 'GM-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const text = [
    'Заявка ' + id,
    'Услуга: ' + serviceSelect.value,
    'Канал: ' + channel,
    'Бюджет: ' + document.getElementById('budget').value,
    'Контакт: ' + contact,
    'Комментарий: ' + (document.getElementById('comment').value || '—')
  ].join('\\n');
  result.textContent = 'Черновик заявки ' + id + ' сформирован. Это демонстрация: данные не отправлены и не сохранены.';
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = id + '.txt';
  link.click();
  URL.revokeObjectURL(link.href);
});