export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelUrl, tariff, quantity } = req.body || {};

    if (typeof channelUrl !== 'string' ||
        !/^https:\/\/(t\.me|telegram\.me)\/[A-Za-z0-9_]{5,32}\/?$/.test(channelUrl.trim())) {
      return res.status(400).json({ error: 'Укажи корректную ссылку на открытый Telegram-канал.' });
    }

    if (!['ordinary', 'live'].includes(tariff)) {
      return res.status(400).json({ error: 'Неизвестный тариф.' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 100 || qty > 100000 || qty % 100 !== 0) {
      return res.status(400).json({ error: 'Количество должно быть от 100 до 100 000, кратно 100.' });
    }

    const amount = tariff === 'ordinary' ? qty : qty * 3;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase server environment variables');
      return res.status(500).json({ error: 'Сервис заказов временно недоступен.' });
    }

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        channel_url: channelUrl.trim(),
        tariff,
        quantity: qty,
        amount,
        status: 'new'
      })
    });

    const inserted = await dbResponse.json().catch(() => null);
    if (!dbResponse.ok || !Array.isArray(inserted) || !inserted[0]) {
      console.error('Supabase insert failed:', dbResponse.status, inserted);
      return res.status(502).json({ error: 'Не удалось сохранить заказ. Попробуй ещё раз позже.' });
    }

    const order = inserted[0];
    const tariffName = tariff === 'ordinary' ? 'Обычные подписчики' : 'Живые подписчики';
    const message = [
      '🛒 Новый заказ Growth Market',
      `Заказ: #${order.order_number}`,
      `Тариф: ${tariffName}`,
      `Количество: ${qty.toLocaleString('ru-RU')}`,
      `Сумма: ${amount.toLocaleString('ru-RU')} ₽`,
      `Канал: ${channelUrl.trim()}`,
      'Статус: Новый'
    ].join('\n');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      try {
        // Register the webhook automatically. The URL key is derived from the bot token,
        // so no additional public secret or manual Telegram setup is required.
        const { createHash } = await import('node:crypto');
        const webhookKey = createHash('sha256').update(botToken).digest('hex');
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_SITE_URL;

        let webhookReady = false;
        if (baseUrl) {
          const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: `${baseUrl}/api/telegram-webhook?key=${webhookKey}`,
              allowed_updates: ['callback_query']
            })
          });
          const webhookResult = await webhookResponse.json().catch(() => ({}));
          webhookReady = webhookResult.ok === true;
          if (!webhookReady) console.error('Telegram webhook setup failed:', webhookResult);
        } else {
          console.error('Missing VERCEL_URL for Telegram webhook setup');
        }

        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            disable_web_page_preview: true,
            ...(webhookReady ? {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 В обработку', callback_data: `gm:${order.order_number}:processing` },
                    { text: '✅ Выполнен', callback_data: `gm:${order.order_number}:completed` }
                  ],
                  [
                    { text: '❌ Отменить', callback_data: `gm:${order.order_number}:cancelled` }
                  ]
                ]
              }
            } : {})
          })
        });
        if (!tgResponse.ok) console.error('Telegram notification failed:', tgResponse.status);
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    } else {
      console.error('Missing Telegram server environment variables');
    }

    return res.status(201).json({
      success: true,
      orderNumber: order.order_number,
      amount
    });
  } catch (error) {
    console.error('Order API error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка. Попробуй ещё раз позже.' });
  }
}
