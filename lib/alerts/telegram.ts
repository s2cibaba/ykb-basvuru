export async function sendTelegramAlert(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  return res.ok;
}

export function formatFailoverAlert(params: {
  from: string;
  to: string | null;
  listSize: number;
}): string {
  const lines = [
    "<b>USOM failover</b>",
    `Engellenen: <code>${params.from}</code>`,
  ];
  if (params.to) {
    lines.push(`Yeni aktif: <code>${params.to}</code>`);
    lines.push("");
    lines.push("Manuel:");
    lines.push("• Meta reklam URL");
    lines.push("• Cloaking.House offer URL");
  } else {
    lines.push("Yedek domain kalmadı!");
  }
  lines.push(`USOM kayıt: ${params.listSize}`);
  return lines.join("\n");
}
