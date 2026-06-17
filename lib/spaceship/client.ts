const BASE_URL = "https://spaceship.dev/api/v1";

function headers(): HeadersInit {
  const key = process.env.SPACESHIP_API_KEY?.trim();
  const secret = process.env.SPACESHIP_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("SPACESHIP_API_KEY ve SPACESHIP_API_SECRET gerekli");
  }
  return {
    "X-Api-Key": key,
    "X-Api-Secret": secret,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type SpaceshipDomain = {
  name: string;
  unicodeName: string;
  expirationDate: string;
  nameservers: { provider: string; hosts: string[] };
};

export async function listSpaceshipDomains(): Promise<SpaceshipDomain[]> {
  const res = await fetch(`${BASE_URL}/domains?take=100&skip=0&orderBy=name`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spaceship list failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { items: SpaceshipDomain[] };
  return data.items ?? [];
}

export async function updateSpaceshipNameservers(
  domain: string,
  hosts: string[]
): Promise<void> {
  const res = await fetch(`${BASE_URL}/domains/${domain}/nameservers`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ provider: "custom", hosts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spaceship NS update failed (${res.status}): ${body}`);
  }
}
