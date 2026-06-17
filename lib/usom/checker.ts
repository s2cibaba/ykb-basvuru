const USOM_LIST_URL = "https://www.usom.gov.tr/url-list.txt";

export interface UsomCheckResult {
  checkedAt: string;
  listSize: number;
  blockedHostnames: string[];
}

function parseHostnamesFromList(raw: string): Set<string> {
  const hostnames = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    try {
      const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      const url = new URL(withProtocol);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host) hostnames.add(host);
    } catch {
      const bare = trimmed
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .toLowerCase();
      if (bare && bare.includes(".")) hostnames.add(bare);
    }
  }
  return hostnames;
}

export function hostnameMatchesBlock(
  hostname: string,
  blockedSet: Set<string>
): boolean {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  if (blockedSet.has(normalized)) return true;

  for (const blocked of blockedSet) {
    if (normalized === blocked || normalized.endsWith(`.${blocked}`)) {
      return true;
    }
  }

  return false;
}

export async function fetchUsomBlockedHostnames(): Promise<Set<string>> {
  const res = await fetch(USOM_LIST_URL, {
    cache: "no-store",
    headers: { Accept: "text/plain" },
  });

  if (!res.ok) {
    throw new Error(`USOM listesi alınamadı (${res.status})`);
  }

  const raw = await res.text();
  return parseHostnamesFromList(raw);
}

export async function checkHostnamesAgainstUsom(
  hostnames: string[]
): Promise<UsomCheckResult> {
  const blockedSet = await fetchUsomBlockedHostnames();
  const blockedHostnames = hostnames.filter((h) =>
    hostnameMatchesBlock(h, blockedSet)
  );

  return {
    checkedAt: new Date().toISOString(),
    listSize: blockedSet.size,
    blockedHostnames,
  };
}
