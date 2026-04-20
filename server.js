const express = require("express");
const { createMollieClient } = require("@mollie/api-client");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("Telegram env vars missing");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Telegram sendMessage failed:", errText);
  }
}

app.get("/", (req, res) => {
  res.send("BOT WORKING");
});

app.post("/webhook", async (req, res) => {
  try {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      console.error("Missing MOLLIE_API_KEY");
      return res.status(200).send("OK");
    }

    const rawId = req.body?.id;

    // ping / пустой тестовый запрос — просто отвечаем OK
    if (!rawId) {
      console.log("Webhook ping/test received");
      return res.status(200).send("OK");
    }

    const mollie = createMollieClient({ apiKey });
    const payment = await mollie.payments.get(rawId);

    console.log("Webhook payment:", payment.id, payment.status);

    if (payment.status === "paid") {
      const productName =
        payment.metadata && payment.metadata.productName
          ? String(payment.metadata.productName)
          : "Unknown product";

      const amount = payment.amount?.value ?? "unknown";
      const currency = payment.amount?.currency ?? "EUR";

      const message =
        `💸 NEW PAYMENT!\n\n` +
        `📦 Product: ${productName}\n` +
        `💰 ${amount} ${currency}\n` +
        `🆔 ${payment.id}\n` +
        `📌 Status: ${payment.status}`;

      await sendTelegramMessage(message);
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).send("OK");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
