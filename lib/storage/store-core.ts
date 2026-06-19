import type {
  Applicant,
  ApplicantStatus,
  ApplicantWithAttempts,
  Attempt,
  AttemptInput,
  AccessLogEntry,
  BanEntry,
  BanType,
  Store,
} from "./types";
import type { FailoverEvent, SiteDomain } from "@/lib/domains/types";
import { zoneRootFromHostname } from "@/lib/domains/types";
import { getAdPoolHosts, getDefaultOfferHost } from "@/lib/offer-host";

const MAX_ACCESS_LOGS = 1000;

export const EMPTY_STORE: Store = {
  applicants: [],
  attempts: [],
  accessLogs: [],
  bans: [],
  siteDomains: [],
};

export function normalizeStore(raw: Partial<Store>): Store {
  const store: Store = {
    applicants: raw.applicants ?? [],
    attempts: raw.attempts ?? [],
    accessLogs: raw.accessLogs ?? [],
    bans: raw.bans ?? [],
    siteDomains: raw.siteDomains ?? [],
  };

  if (store.siteDomains.length === 0) {
    const formHost = getDefaultOfferHost();
    store.siteDomains = [
      {
        id: crypto.randomUUID(),
        hostname: "kredifirsatlari.org",
        status: "active",
        isPrimary: true,
        zoneRoot: "kredifirsatlari.org",
        hostType: "apex",
        lastUsomCheck: null,
        blockedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        hostname: formHost,
        status: "standby",
        isPrimary: false,
        zoneRoot: formHost,
        hostType: "apex",
        lastUsomCheck: null,
        blockedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        hostname: "ekonomikbakis.org",
        status: "standby",
        isPrimary: false,
        zoneRoot: "ekonomikbakis.org",
        hostType: "apex",
        lastUsomCheck: null,
        blockedAt: null,
        createdAt: new Date().toISOString(),
      },
    ];
  } else {
    repairSiteDomains(store);
  }

  return store;
}

/** KV'de form host yanlışlıkla active ise reklam pool'undan birini aktif yap */
function repairSiteDomains(store: Store): void {
  const formHost = getDefaultOfferHost();
  const pool = getAdPoolHosts();

  const activeAd = store.siteDomains.find(
    (d) =>
      d.status === "active" &&
      d.hostname !== formHost &&
      pool.includes(d.hostname)
  );
  if (activeAd) return;

  const candidate = store.siteDomains.find(
    (d) =>
      pool.includes(d.hostname) &&
      d.status === "standby"
  );
  if (!candidate) return;

  for (const d of store.siteDomains) {
    if (d.hostname === formHost || d.status === "active") {
      d.status = "standby";
    }
  }
  candidate.status = "active";
}

function isBanActive(ban: BanEntry): boolean {
  if (ban.expiresAt && new Date(ban.expiresAt) < new Date()) return false;
  return true;
}

export function withAttempts(
  store: Store,
  applicant: Applicant
): ApplicantWithAttempts {
  return {
    ...applicant,
    attempts: store.attempts
      .filter((a) => a.applicantId === applicant.id)
      .sort((a, b) => a.attemptNumber - b.attemptNumber),
  };
}

export type StoreIO = {
  readStore: () => Promise<Store>;
  writeStore: (store: Store) => Promise<void>;
};

export function createStoreAdapter(io: StoreIO) {
  const { readStore, writeStore } = io;

  return {
    async createApplicant(sessionId: string, ipAddress = ""): Promise<Applicant> {
      const store = await readStore();
      const applicant: Applicant = {
        id: crypto.randomUUID(),
        sessionId,
        ipAddress,
        status: "in_progress",
        currentAttempt: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      store.applicants.push(applicant);
      await writeStore(store);
      return applicant;
    },

    async getApplicantBySession(sessionId: string): Promise<Applicant | null> {
      const store = await readStore();
      return store.applicants.find((a) => a.sessionId === sessionId) ?? null;
    },

    async getApplicant(id: string): Promise<ApplicantWithAttempts | null> {
      const store = await readStore();
      const applicant = store.applicants.find((a) => a.id === id);
      if (!applicant) return null;
      return withAttempts(store, applicant);
    },

    async listApplicants(): Promise<ApplicantWithAttempts[]> {
      const store = await readStore();
      return store.applicants
        .map((a) => withAttempts(store, a))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    async addAttempt(applicantId: string, data: AttemptInput): Promise<Attempt> {
      const store = await readStore();
      const applicant = store.applicants.find((a) => a.id === applicantId);
      if (!applicant) throw new Error("Applicant not found");
      if (applicant.currentAttempt >= 4) {
        throw new Error("Maximum attempts reached");
      }

      const attemptNumber = applicant.currentAttempt + 1;
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        applicantId,
        attemptNumber,
        ...data,
        createdAt: new Date().toISOString(),
      };

      store.attempts.push(attempt);
      applicant.currentAttempt = attemptNumber;
      await writeStore(store);
      return attempt;
    },

    async updateApplicantStatus(
      id: string,
      status: ApplicantStatus,
      completedAt?: string
    ): Promise<void> {
      const store = await readStore();
      const applicant = store.applicants.find((a) => a.id === id);
      if (!applicant) throw new Error("Applicant not found");
      applicant.status = status;
      if (completedAt) applicant.completedAt = completedAt;
      await writeStore(store);
    },

    async logAccess(
      entry: Omit<AccessLogEntry, "id" | "createdAt">
    ): Promise<AccessLogEntry> {
      const store = await readStore();
      const logEntry: AccessLogEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...entry,
      };
      store.accessLogs.unshift(logEntry);
      if (store.accessLogs.length > MAX_ACCESS_LOGS) {
        store.accessLogs.length = MAX_ACCESS_LOGS;
      }
      await writeStore(store);
      return logEntry;
    },

    async clearAccessLogs(): Promise<void> {
      const store = await readStore();
      store.accessLogs = [];
      await writeStore(store);
    },

    async listAccessLogs(limit = 200): Promise<AccessLogEntry[]> {
      const store = await readStore();
      return store.accessLogs.slice(0, limit);
    },

    async listBans(): Promise<BanEntry[]> {
      const store = await readStore();
      return store.bans
        .filter(isBanActive)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    async addBan(
      type: BanType,
      value: string,
      reason?: string,
      expiresAt: string | null = null
    ): Promise<BanEntry> {
      const store = await readStore();
      const normalized = value.trim();
      const existing = store.bans.find(
        (b) => b.type === type && b.value === normalized && isBanActive(b)
      );
      if (existing) return existing;

      const ban: BanEntry = {
        id: crypto.randomUUID(),
        type,
        value: normalized,
        reason,
        createdAt: new Date().toISOString(),
        expiresAt,
      };
      store.bans.push(ban);
      await writeStore(store);
      return ban;
    },

    async removeBan(id: string): Promise<boolean> {
      const store = await readStore();
      const index = store.bans.findIndex((b) => b.id === id);
      if (index === -1) return false;
      store.bans.splice(index, 1);
      await writeStore(store);
      return true;
    },

    async checkBan(params: {
      ip?: string;
      sessionId?: string;
      tcKimlik?: string;
    }): Promise<{ banned: boolean; reason?: string; ban?: BanEntry }> {
      const store = await readStore();
      const activeBans = store.bans.filter(isBanActive);

      for (const ban of activeBans) {
        if (ban.type === "ip" && params.ip && ban.value === params.ip) {
          return { banned: true, reason: ban.reason ?? "IP yasaklandı", ban };
        }
        if (
          ban.type === "session" &&
          params.sessionId &&
          ban.value === params.sessionId
        ) {
          return {
            banned: true,
            reason: ban.reason ?? "Oturum yasaklandı",
            ban,
          };
        }
        if (ban.type === "tc" && params.tcKimlik && ban.value === params.tcKimlik) {
          return { banned: true, reason: ban.reason ?? "TC yasaklandı", ban };
        }
      }

      return { banned: false };
    },

    async listSiteDomains(): Promise<SiteDomain[]> {
      const store = await readStore();
      return [...store.siteDomains].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    async getActiveSiteDomain(): Promise<SiteDomain | null> {
      const store = await readStore();
      const form = getDefaultOfferHost();
      return (
        store.siteDomains.find(
          (d) => d.status === "active" && d.hostname !== form
        ) ?? null
      );
    },

    async addSiteDomain(
      hostname: string,
      status: SiteDomain["status"] = "standby",
      meta?: { zoneRoot?: string; hostType?: SiteDomain["hostType"] }
    ): Promise<SiteDomain> {
      const store = await readStore();
      const normalized = hostname.toLowerCase().replace(/^www\./, "");
      const existing = store.siteDomains.find((d) => d.hostname === normalized);
      if (existing) return existing;

      const domain: SiteDomain = {
        id: crypto.randomUUID(),
        hostname: normalized,
        status,
        isPrimary: false,
        zoneRoot: meta?.zoneRoot ?? zoneRootFromHostname(normalized),
        hostType:
          meta?.hostType ??
          (normalized.split(".").length > 2 ? "subdomain" : "apex"),
        lastUsomCheck: null,
        blockedAt: null,
        createdAt: new Date().toISOString(),
      };
      store.siteDomains.push(domain);
      await writeStore(store);
      return domain;
    },

    async setActiveSiteDomain(hostname: string): Promise<SiteDomain> {
      const store = await readStore();
      const normalized = hostname.toLowerCase().replace(/^www\./, "");
      let target = store.siteDomains.find((d) => d.hostname === normalized);

      if (!target) {
        target = {
          id: crypto.randomUUID(),
          hostname: normalized,
          status: "active",
          isPrimary: false,
          zoneRoot: zoneRootFromHostname(normalized),
          hostType:
            normalized.split(".").length > 2 ? "subdomain" : "apex",
          lastUsomCheck: null,
          blockedAt: null,
          createdAt: new Date().toISOString(),
        };
        store.siteDomains.push(target);
      }

      const form = getDefaultOfferHost();
      for (const d of store.siteDomains) {
        if (d.hostname === form) {
          d.status = "standby";
          continue;
        }
        if (d.id === target.id) {
          d.status = "active";
          d.blockedAt = null;
        } else if (d.status === "active") {
          d.status = "standby";
        }
      }

      await writeStore(store);
      return target;
    },

    async updateSiteDomainUsomCheck(
      hostname: string,
      blocked: boolean,
      checkedAt: string
    ): Promise<void> {
      const store = await readStore();
      const normalized = hostname.toLowerCase().replace(/^www\./, "");
      const domain = store.siteDomains.find((d) => d.hostname === normalized);
      if (!domain) return;

      domain.lastUsomCheck = checkedAt;
      if (blocked) {
        domain.status = "blocked";
        domain.blockedAt = checkedAt;
      }

      await writeStore(store);
    },

    async getSiteSetting(key: string): Promise<string | null> {
      const store = await readStore();
      return (store as Store & { settings?: Record<string, string> }).settings?.[
        key
      ] ?? null;
    },

    async setSiteSetting(key: string, value: string): Promise<void> {
      const store = await readStore();
      const extended = store as Store & {
        settings?: Record<string, string>;
        failoverEvents?: FailoverEvent[];
      };
      if (!extended.settings) extended.settings = {};
      extended.settings[key] = value;
      await writeStore(store);
    },

    async listFailoverEvents(limit = 50): Promise<FailoverEvent[]> {
      const store = await readStore();
      const events =
        (store as Store & { failoverEvents?: FailoverEvent[] }).failoverEvents ??
        [];
      return [...events]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);
    },

    async logFailoverEvent(event: {
      fromHostname: string;
      toHostname: string | null;
      trigger: "cron" | "manual";
      usomCheckedAt: string;
    }): Promise<FailoverEvent> {
      const store = await readStore();
      const extended = store as Store & { failoverEvents?: FailoverEvent[] };
      if (!extended.failoverEvents) extended.failoverEvents = [];
      const row: FailoverEvent = {
        id: crypto.randomUUID(),
        fromHostname: event.fromHostname,
        toHostname: event.toHostname,
        trigger: event.trigger,
        usomCheckedAt: event.usomCheckedAt,
        createdAt: new Date().toISOString(),
      };
      extended.failoverEvents.push(row);
      await writeStore(store);
      return row;
    },
  };
}
