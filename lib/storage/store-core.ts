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

const MAX_ACCESS_LOGS = 1000;

export const EMPTY_STORE: Store = {
  applicants: [],
  attempts: [],
  otpCodes: [],
  accessLogs: [],
  bans: [],
};

export function normalizeStore(raw: Partial<Store>): Store {
  return {
    applicants: raw.applicants ?? [],
    attempts: raw.attempts ?? [],
    otpCodes: raw.otpCodes ?? [],
    accessLogs: raw.accessLogs ?? [],
    bans: raw.bans ?? [],
  };
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
      if (applicant.currentAttempt >= 3) {
        throw new Error("Maximum attempts reached");
      }

      const attemptNumber = applicant.currentAttempt + 1;
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        applicantId,
        attemptNumber,
        ...data,
        smsSent: false,
        otpVerified: false,
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

    async saveOtp(attemptId: string, phone: string, code: string): Promise<void> {
      const store = await readStore();
      store.otpCodes = store.otpCodes.filter((o) => o.attemptId !== attemptId);
      store.otpCodes.push({
        attemptId,
        phone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false,
      });

      const attempt = store.attempts.find((a) => a.id === attemptId);
      if (attempt) attempt.smsSent = true;
      await writeStore(store);
    },

    async verifyOtp(attemptId: string, code: string): Promise<boolean> {
      const store = await readStore();
      const otp = store.otpCodes.find((o) => o.attemptId === attemptId);
      if (!otp) return false;
      if (otp.verified) return false;
      if (new Date(otp.expiresAt) < new Date()) return false;
      if (otp.code !== code) return false;
      otp.verified = true;
      await writeStore(store);
      return true;
    },

    async markAttemptOtpVerified(attemptId: string): Promise<void> {
      const store = await readStore();
      const attempt = store.attempts.find((a) => a.id === attemptId);
      if (attempt) attempt.otpVerified = true;
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
  };
}
