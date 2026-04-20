const express = require("express");
const { createMollieClient } = require("@mollie/api-client");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 👉 отправка в Telegram
async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("❌ Telegram env vars missing");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ Telegram error:", err);
  } else {
    console.log("✅ Sent to Telegram");
  }
}

// 👉 тест страница
app.get("/", (req, res) => {
  res.send("✅ BOT WORKING");
});

// 👉 webhook от Mollie
app.post("/webhook", async (req, res) => {
  try {
    const apiKey = process.env.MOLLIE_API_KEY;

    if (!apiKey) {
      console.error("❌ NO API KEY");
      return res.sendStatus(500);
    }

    const mollie = createMollieClient({ apiKey });

    const paymentId = req.body.id;

    console.log("🔥 WEBHOOK:", paymentId);

    if (!paymentId) {
      return res.sendStatus(400);
    }

    const payment = await mollie.payments.get(paymentId);

    console.log("STATUS:", payment.status);

    // 👉 ВАЖНО: НЕ isPaid(), а status === "paid"
    if (payment.status === "paid") {
      const productName =
        payment.metadata?.productName || "Unknown product";

      const amount = payment.amount.value;
      const currency = payment.amount.currency;

      const message =
        `💸 NEW PAYMENT!\n\n` +
        `📦 Product: ${productName}\n` +
        `💰 ${amount} ${currency}\n` +
        `🆔 ${payment.id}`;

      await sendTelegramMessage(message);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});