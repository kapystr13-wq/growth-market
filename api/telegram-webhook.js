import { createHash, timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

async function telegram(method, token, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.json().catch(() => ({}));
}

const labels = {
  new: 'Новый',
  processing: 'В обработке',
  completed: 'Выполнен',
  cancelled: 'Отменён'
};

function keyboard(orderNumber) {
  return {
    inline_keyboard: [
      [
        { text: '🔄 В обработку', callback_data: `gm:${orderNumber}:processing` },
        { text: '✅ Выполнен', callback_data: `gm:${orderNumber}:completed` }
      ],
      [
        { text: '❌ Отменить', callback_data: `gm:${orderNumber}:cancelled` }
      ]
    ]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!token || !chatId || !supabaseUrl || !supabaseKey) {
    return res.status(500).send('Server configuration error');
  }

  const expectedKey = createHash('sha256').update(token).digest('hex');
  if (!safeEqual(req.query?.key, expectedKey)) {
    return res.status(403).send('Forbidden');
  }

  try {
    const callback = req.body?.callback_query;
    if (!callback) return res.status(200).send('OK');

    const callbackMessage = callback.message;
    const senderId = callback.from?.id;
    const messageChatId = String(callbackMessage?.chat?.id ?? '');

    if (!callbackMessage || messageChatId !== String(chatId)) {
      await telegram('answerCallbackQuery', token, {
        callback_query_id: callback.id,
        text: 'Это действие недоступно.',
        show_alert: true
      });
      return res.status(200).send('OK');
    }

    // Only administrators of the private orders group may change order statuses.
    const member = await telegram('getChatMember', token, {
      chat_id: chatId,
      user_id: senderId
    });
    const memberStatus = member.result?.status;
    if (!member.ok || !['creator', 'administrator'].includes(memberStatus)) {
      await telegram('answerCallbackQuery', token, {
        callback_query_id: callback.id,
        text: 'Менять статусы могут только администраторы группы.',
        show_alert: true
      });
      return res.status(200).send('OK');
    }

    const match = /^gm:(\d+):(processing|completed|cancelled)$/.exec(
      String(callback.data || '')
    );
    if (!match) {
      await telegram('answerCallbackQuery', token, {
        callback_query_id: callback.id,
        text: 'Неизвестное действие.',
        show_alert: true
      });
      return res.status(200).send('OK');
    }

    const orderNumber = Number(match[1]);
    const status = match[2];

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${orderNumber}&select=order_number,channel_url,tariff,quantity,amount,status`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ status })
      }
    );

    const updated = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok || !Array.isArray(updated) || !updated[0]) {
      console.error('Order status update failed:', updateResponse.status, updated);
      await telegram('answerCallbackQuery', token, {
        callback_query_id: callback.id,
        text: 'Не удалось обновить заказ. Попробуй ещё раз.',
        show_alert: true
      });
      return res.status(200).send('OK');
    }

    const order = updated[0];
    const tariffName = order.tariff === 'ordinary' ? 'Обычные подписчики' : 'Живые подписчики';
    const text = [
      '🛒 Заказ Growth Market',
      `Заказ: #${order.order_number}`,
      `Тариф: ${tariffName}`,
      `Количество: ${Number(order.quantity).toLocaleString('ru-RU')}`,
      `Сумма: ${Number(order.amount).toLocaleString('ru-RU')} ₽`,
      `Канал: ${order.channel_url}`,
      `Статус: ${labels[order.status] || order.status}`
    ].join('\n');

    const edit = await telegram('editMessageText', token, {
      chat_id: chatId,
      message_id: callbackMessage.message_id,
      text,
      disable_web_page_preview: true,
      reply_markup: ['completed', 'cancelled'].includes(order.status)
        ? { inline_keyboard: [] }
        : keyboard(order.order_number)
    });

    if (!edit.ok) console.error('Telegram message edit failed:', edit);
    await telegram('answerCallbackQuery', token, {
      callback_query_id: callback.id,
      text: `Заказ #${order.order_number}: ${labels[status]}`
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.status(200).send('OK');
  }
}
