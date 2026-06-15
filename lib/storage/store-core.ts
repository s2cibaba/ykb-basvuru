import type {
  Applicant,
  ApplicantStatus,
  ApplicantWithAttempts,
  Attempt,
  AttemptInput,
  Store,
} from "./types";

export const EMPTY_STORE: Store = {
  applicants: [],
  attempts: [],
  otpCodes: [],
};

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
  };
}
