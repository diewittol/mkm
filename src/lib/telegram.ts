const TELEGRAM_TIMEOUT_MS = 8000;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface NewApplicationNotice {
  name: string;
  phone: string;
  message?: string | null;
  productName?: string | null;
}

// Уведомление о новой заявке. Ничего не бросает наружу: если Telegram
// недоступен или не настроен, заявка всё равно уже сохранена в базе.
export async function notifyNewApplication(app: NewApplicationNotice) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    "<b>Новая заявка с сайта</b>",
    "",
    `Имя: ${escapeHtml(app.name)}`,
    `Телефон: ${escapeHtml(app.phone)}`,
  ];
  if (app.productName) lines.push(`Изделие: ${escapeHtml(app.productName)}`);
  if (app.message) lines.push("", escapeHtml(app.message));

  const siteUrl = process.env.SITE_URL;
  if (siteUrl) lines.push("", `${siteUrl}/admin/requests`);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      console.error(
        "Telegram notify failed:",
        response.status,
        await response.text().catch(() => ""),
      );
    }
  } catch (error) {
    console.error("Telegram notify error:", error);
  }
}
