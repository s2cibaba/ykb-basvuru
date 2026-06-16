export type ApplicantStatus = "in_progress" | "completed" | "failed";

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
}

export interface Attempt extends AttemptInput {
  id: string;
  applicantId: string;
  attemptNumber: number;
  smsSent: boolean;
  otpVerified: boolean;
  createdAt: string;
}

export interface OtpCode {
  attemptId: string;
  phone: string;
  code: string;
  expiresAt: string;
  verified: boolean;
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
  otpCodes: OtpCode[];
  accessLogs: AccessLogEntry[];
  bans: BanEntry[];
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
  saveOtp(attemptId: string, phone: string, code: string): Promise<void>;
  verifyOtp(attemptId: string, code: string): Promise<boolean>;
  markAttemptOtpVerified(attemptId: string): Promise<void>;
  logAccess(entry: Omit<AccessLogEntry, "id" | "createdAt">): Promise<AccessLogEntry>;
  listAccessLogs(limit?: number): Promise<AccessLogEntry[]>;
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
}
