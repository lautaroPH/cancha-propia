const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type AthleteCard = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  province: string | null;
  sport: string;
  discipline: string | null;
  identity_verified: boolean;
  career_verified: boolean;
  competition_verified: boolean;
  has_active_campaign: boolean;
};

export type CampaignBreakdownItem = {
  label: string;
  amount_ars: number;
};

export type Campaign = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  status: "draft" | "active" | "grace" | "closed" | "expired";
  goal_amount_ars: number;
  raised_amount_ars: number | null;
  breakdown_items: CampaignBreakdownItem[];
};

export type AthleteProfile = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  province: string | null;
  sport: string;
  discipline: string | null;
  category: string | null;
  club: string | null;
  federation: string | null;
  bio: string | null;
  story: string | null;
  achievements: { title: string; year?: number; description?: string }[];
  identity_verified: boolean;
  career_verified: boolean;
  competition_verified: boolean;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  alias: string | null;
  cbu: string | null;
  campaigns: Campaign[];
};

export type ApplicationPayload = {
  full_name: string;
  date_of_birth: string;
  national_id: string;
  province?: string;
  sport: string;
  discipline?: string;
  category?: string;
  club?: string;
  federation?: string;
  federation_license_number?: string;
  bio?: string;
  story?: string;
  contact_email: string;
  evidence_links: string[];
  guardian?: {
    full_name: string;
    relationship: string;
    email: string;
    phone?: string;
  };
};

export type AdminAthleteListItem = {
  id: string;
  slug: string;
  full_name: string;
  status: "pending" | "active" | "rejected" | "suspended";
  sport: string;
  province: string | null;
  identity_verified: boolean;
  career_verified: boolean;
  competition_verified: boolean;
  created_at: string;
};

export type EvidenceFileEntry = {
  kind: string;
  s3_key: string;
  original_filename: string | null;
  uploaded_at: string;
};

export type GuardianInfo = {
  full_name: string;
  relationship: string;
  email: string;
  phone: string | null;
};

export type AthleteDetail = AthleteProfile & {
  id: string;
  status: string;
  date_of_birth: string;
  is_minor: boolean;
  federation_license_number: string | null;
  contact_email: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  next_review_due: string | null;
  created_at: string;
  instagram_public: boolean;
  whatsapp_public: boolean;
  alias_public: boolean;
};

export type AthleteAdminDetail = AthleteDetail & {
  guardian: GuardianInfo | null;
  evidence: EvidenceFileEntry[];
};

export type AuditLogEntry = {
  action: string;
  detail: Record<string, unknown> | null;
  admin_email: string;
  created_at: string;
};

export type AthleteSelfUpdatePayload = Partial<{
  bio: string;
  story: string;
  achievements: { title: string; year?: number; description?: string }[];
  photo_s3_key: string;
  instagram_handle: string;
  instagram_public: boolean;
  whatsapp_number: string;
  whatsapp_public: boolean;
  alias: string;
  cbu: string;
  alias_public: boolean;
}>;

export type CampaignCreatePayload = {
  title: string;
  description?: string;
  event_date?: string;
  goal_amount_ars: number;
  breakdown: CampaignBreakdownItem[];
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `Request to ${path} failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function authedFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
    cache: "no-store",
  });
}

export function listAthletes(filters?: { sport?: string; province?: string }) {
  const params = new URLSearchParams();
  if (filters?.sport) params.set("sport", filters.sport);
  if (filters?.province) params.set("province", filters.province);
  const qs = params.toString();
  return apiFetch<AthleteCard[]>(`/athletes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
}

export function getAthlete(slug: string) {
  return apiFetch<AthleteProfile>(`/athletes/${slug}`, { cache: "no-store" });
}

export function submitApplication(payload: ApplicationPayload) {
  return apiFetch<{ id: string; slug: string; status: string }>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Admin ---

export function adminListApplications(token: string) {
  return authedFetch<AdminAthleteListItem[]>(token, "/admin/applications");
}

export function adminListAthletes(token: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return authedFetch<AdminAthleteListItem[]>(token, `/admin/athletes${qs}`);
}

export function adminGetAthlete(token: string, id: string) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}`);
}

export function adminApprove(
  token: string,
  id: string,
  payload: { identity_verified: boolean; career_verified: boolean; competition_verified: boolean; notes?: string }
) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminReject(token: string, id: string, reason: string) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function adminRequestInfo(token: string, id: string, message: string) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}/request-info`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function adminSuspend(token: string, id: string, reason: string) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function adminReactivate(token: string, id: string) {
  return authedFetch<AthleteAdminDetail>(token, `/admin/athletes/${id}/reactivate`, { method: "POST" });
}

export function adminApproveCampaign(token: string, campaignId: string) {
  return authedFetch<Campaign>(token, `/admin/campaigns/${campaignId}/approve`, { method: "POST" });
}

export function adminAuditLog(token: string, athleteId: string) {
  return authedFetch<AuditLogEntry[]>(token, `/admin/athletes/${athleteId}/audit-log`);
}

// --- Self-serve (athlete/guardian) ---

export function getMe(token: string) {
  return authedFetch<AthleteDetail>(token, "/me");
}

export function updateMe(token: string, payload: AthleteSelfUpdatePayload) {
  return authedFetch<AthleteDetail>(token, "/me", { method: "PATCH", body: JSON.stringify(payload) });
}

export function createMyCampaign(token: string, payload: CampaignCreatePayload) {
  return authedFetch<Campaign>(token, "/me/campaigns", { method: "POST", body: JSON.stringify(payload) });
}

export function updateMyCampaignRaised(token: string, campaignId: string, raised_amount_ars: number) {
  return authedFetch<Campaign>(token, `/me/campaigns/${campaignId}/raised`, {
    method: "PATCH",
    body: JSON.stringify({ raised_amount_ars }),
  });
}

export function closeMyCampaign(token: string, campaignId: string) {
  return authedFetch<Campaign>(token, `/me/campaigns/${campaignId}/close`, { method: "POST" });
}
