import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";

const SP_API = "https://spaceship.dev/api/v1";

export async function POST(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hostname } = await request.json();
    if (!hostname) {
      return NextResponse.json({ error: "Hostname required" }, { status: 400 });
    }

    const key = process.env.SPACESHIP_API_KEY;
    const secret = process.env.SPACESHIP_API_SECRET;

    if (!key || !secret) {
      return NextResponse.json({ error: "Spaceship API credentials missing" }, { status: 500 });
    }

    // Extract root domain (e.g., www.example.com -> example.com)
    const parts = hostname.split('.');
    const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;

    const res = await fetch(`${SP_API}/domains/${rootDomain}/nameservers`, {
      method: "PUT",
      headers: {
        "X-Api-Key": key,
        "X-Api-Secret": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "custom",
        hosts: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spaceship API error: ${text}`);
    }

    return NextResponse.json({ success: true, message: "Nameservers updated to Vercel" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Routing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
