const rates = {'Обычные подписчики Telegram':100,'Живые подписчики Telegram':300};
const basic = document.getElementById('qty-basic');
const live = document.getElementById('qty-live');
const category = document.getElementById('category');
const quantity = document.getElementById('quantity');
function validQty(el){let n=Math.round(Number(el.value||100)/100)*100;n=Math.min(100000,Math.max(100,n));el.value=n;return n;}
function price(n,rate){return (n/100*rate).toLocaleString('ru-RU')+' ₽';}
function update(){document.getElementById('total-basic').textContent=price(validQty(basic),100);document.getElementById('total-live').textContent=price(validQty(live),300);quantity.value=validQty(quantity);document.getElementById('order-total').textContent=price(Number(quantity.value),rates[category.value]);}
[basic,live,quantity].forEach(el=>el.addEventListener('change',update));
category.addEventListener('change',update);
document.querySelectorAll('.pick').forEach(btn=>btn.addEventListener('click',()=>{category.value=btn.dataset.type;quantity.value=btn.dataset.type.startsWith('Живые')?live.value:basic.value;update();document.getElementById('order').scrollIntoView({behavior:'smooth'});}));
document.getElementById('orderForm').addEventListener('submit',e=>{e.preventDefault();const link=document.getElementById('channel').value.trim();if(!/^https:\/\/t\.me\/[A-Za-z0-9_]+\/?$/.test(link)){document.getElementById('result').textContent='Укажи корректную публичную ссылку вида https://t.me/channelname';return;}const id='GM-'+Math.random().toString(36).slice(2,8).toUpperCase();document.getElementById('result').textContent='Черновик '+id+' сформирован. Это демо: заявка не отправлена, оплата не подключена.';});
update();