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

export interface Store {
  applicants: Applicant[];
  attempts: Attempt[];
  otpCodes: OtpCode[];
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
}
