import { serve } from "bun";
import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

type TelegramReportBody = {
  step: number;
  title: string;
  fields?: Record<string, string>;
  image?: {
    fileName: string;
    dataUrl: string;
  };
};

const distDir = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 8080);

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const validateReportBody = (body: unknown): TelegramReportBody | null => {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Partial<TelegramReportBody>;
  if (typeof candidate.step !== "number" || candidate.step < 1 || candidate.step > 20) return null;
  if (typeof candidate.title !== "string" || candidate.title.trim().length < 2 || candidate.title.length > 120) return null;
  if (candidate.fields && (typeof candidate.fields !== "object" || Array.isArray(candidate.fields))) return null;
  if (candidate.image) {
    if (typeof candidate.image.fileName !== "string" || typeof candidate.image.dataUrl !== "string") return null;
    if (!candidate.image.dataUrl.startsWith("data:image/")) return null;
  }
  return candidate as TelegramReportBody;
};

const dataUrlToBlob = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) throw new Error("Unsupported image format");
  const [, mimeType, base64] = match;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
};

const sendTelegramReport = async (req: Request) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return json({ error: "Telegram secrets are not configured" }, 500);
  }

  let body: TelegramReportBody | null = null;
  try {
    body = validateReportBody(await req.json());
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body) {
    return json({ error: "Invalid report payload" }, 400);
  }

  const fieldLines = Object.entries(body.fields ?? {})
    .filter(([, value]) => value && value.trim())
    .map(([key, value]) => `<b>${escapeHtml(key)}:</b> ${escapeHtml(value).slice(0, 900)}`);
  const text = [`<b>RetailEval Application Update</b>`, `<b>Step ${body.step}:</b> ${escapeHtml(body.title)}`, ...fieldLines].join("\n");
  const apiBase = `https://api.telegram.org/bot${token}`;

  const telegramResponse = body.image
    ? await (async () => {
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("caption", text.slice(0, 1024));
        formData.append("parse_mode", "HTML");
        formData.append("photo", dataUrlToBlob(body.image!.dataUrl), body.image!.fileName);
        return fetch(`${apiBase}/sendPhoto`, { method: "POST", body: formData });
      })()
    : await fetch(`${apiBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });

  const result = await telegramResponse.json();
  if (!telegramResponse.ok || !result.ok) {
    return json({ error: "Telegram delivery failed" }, 502);
  }

  return json({ ok: true });
};

const serveStatic = async (url: URL) => {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(distDir, requestedPath));
  const safeFilePath = filePath.startsWith(distDir) && existsSync(filePath) ? filePath : join(distDir, "index.html");
  return new Response(Bun.file(safeFilePath));
};

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }

    if (url.pathname === "/api/telegram-report") {
      if (req.method === "OPTIONS") return new Response("ok");
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return sendTelegramReport(req);
    }

    return serveStatic(url);
  },
});

console.log(`RetailEval server running on port ${port}`);