import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateCaptchaCode,
  setCaptcha,
} from "@/lib/captcha";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("captcha_session")?.value;
  if (!sessionId) sessionId = uuidv4();

  const code = generateCaptchaCode();
  setCaptcha(sessionId, code);

  const response = new NextResponse(
    generateCaptchaSvg(code),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    }
  );

  response.cookies.set("captcha_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}

function generateCaptchaSvg(code: string): string {
  const chars = code.split("");
  const charElements = chars
    .map((c, i) => {
      const x = 16 + i * 25;
      const y = 28 + (Math.random() - 0.5) * 6;
      const rotate = (Math.random() - 0.5) * 25;
      const fontSize = 20 + Math.floor(Math.random() * 4);
      return `<text x="${x}" y="${y}" fill="#004990" font-family="Comic Sans MS,cursive" font-size="${fontSize}" font-weight="bold" transform="rotate(${rotate} ${x} ${y})">${c}</text>`;
    })
    .join("");

  const strikeY = 18 + Math.random() * 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="166" height="40" viewBox="0 0 166 40">
    <rect width="166" height="40" fill="#d8d8d8" rx="0"/>
    <line x1="8" y1="${strikeY}" x2="158" y2="${strikeY + 4}" stroke="#999" stroke-width="1.5"/>
    ${charElements}
  </svg>`;
}
