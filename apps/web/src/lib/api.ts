const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type SportOption = {
  id: string;
  name: string;
  active: boolean;
};

export type AthleteCard = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  province: string | null;
  city: string | null;
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
  status: "draft" | "active" | "grace" | "closed" | "expired" | "paused";
  goal_amount_ars: number;
  raised_amount_ars: number | null;
  breakdown_items: CampaignBreakdownItem[];
};

// Mirrors app/schemas/schemas.py REPORT_REASONS on the backend, which validates it.
export const REPORT_REASONS = [
  "Información falsa o engañosa",
  "Suplantación de identidad",
  "Contenido inapropiado",
  "Perfil duplicado",
  "Otro",
] as const;

export type CampaignAdminOut = Campaign & {
  athlete_id: string;
  athlete_slug: string;
  athlete_full_name: string;
};

export type ReportOut = {
  id: string;
  athlete_id: string;
  athlete_slug: string;
  athlete_full_name: string;
  reason: string;
  detail: string | null;
  status: "open" | "resolved";
  resolved_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type Achievement = { title: string; date?: string; description?: string };

export type AthleteProfile = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  province: string | null;
  city: string | null;
  sport: string;
  discipline: string | null;
  category: string | null;
  club: string | null;
  federation: string | null;
  bio: string | null;
  story: string | null;
  achievements: Achievement[];
  identity_verified: boolean;
  career_verified: boolean;
  competition_verified: boolean;
  instagram_handle: string | null;
  instagram_posts: string[];
  whatsapp_number: string | null;
  alias: string | null;
  cbu: string | null;
  raffle_url: string | null;
  raffle_description: string | null;
  campaigns: Campaign[];
};

export type ApplicationPayload = {
  full_name: string;
  date_of_birth: string;
  sport: string;
  province?: string;
  city?: string;
  instagram_handle?: string;
  bio?: string;
  // Optional — the reviewer needs an Instagram handle or at least one link.
  evidence_links: string[];
  // Minors hold their own account (contact_email is always the caller's own
  // login) — the guardian is consent-only, captured here, not a separate account.
  guardian_email?: string;
  guardian_consent?: boolean;
};

export type AdminAthleteListItem = {
  id: string;
  slug: string;
  full_name: string;
  status: "invited" | "pending" | "active" | "rejected" | "suspended";
  sport: string;
  province: string | null;
  identity_verified: boolean;
  career_verified: boolean;
  competition_verified: boolean;
  created_at: string;
};

export type EvidenceFileEntry = {
  id: string;
  kind: string;
  s3_key: string;
  original_filename: string | null;
  uploaded_at: string;
};

export type AthleteDetail = AthleteProfile & {
  id: string;
  status: string;
  date_of_birth: string | null; // null only on an unclaimed invite
  is_minor: boolean;
  federation_license_number: string | null;
  contact_email: string | null; // null only on an unclaimed invite
  guardian_email: string | null;
  guardian_consent_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  reapply_available_at: string | null;
  info_requested_message: string | null;
  info_requested_at: string | null;
  suspended_reason: string | null;
  suspended_at: string | null;
  admin_notes: string | null;
  next_review_due: string | null;
  created_at: string;
  instagram_public: boolean;
  whatsapp_public: boolean;
  alias_public: boolean;
  raffle_public: boolean;
  evidence: EvidenceFileEntry[];
};

export type AthleteAdminDetail = AthleteDetail & {
  evidence: EvidenceFileEntry[];
};

export type AuditLogEntry = {
  action: string;
  detail: Record<string, unknown> | null;
  admin_email: string;
  created_at: string;
};

export type AthleteSelfUpdatePayload = Partial<{
  sport: string;
  discipline: string | null;
  category: string | null;
  province: string | null;
  city: string | null;
  club: string | null;
  federation: string | null;
  instagram_posts: string[];
  bio: string;
  story: string;
  achievements: Achievement[];
  photo_s3_key: string;
  instagram_handle: string;
  instagram_public: boolean;
  whatsapp_number: string;
  whatsapp_public: boolean;
  alias: string;
  cbu: string;
  alias_public: boolean;
  raffle_url: string;
  raffle_description: string;
  raffle_public: boolean;
}>;

export type CampaignCreatePayload = {
  title: string;
  description?: string;
  event_date?: string;
  goal_amount_ars: number;
  breakdown: CampaignBreakdownItem[];
};

// FastAPI's `detail` is a plain string for a manual HTTPException(...), but
// for a 422 (Pydantic validation failure) it's an array of error objects
// instead — passing that straight to `new Error()` stringifies it as
// "[object Object]" rather than anything readable.
function errorDetailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : null))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join("; ");
  }
  return fallback;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorDetailToMessage(body?.detail, `Request to ${path} failed with ${res.status}`));
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

export type AthleteFilters = {
  q?: string;
  sport?: string;
  province?: string;
  verified?: boolean;
  has_upcoming_competition?: boolean;
};

export function listAthletes(filters?: AthleteFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.sport) params.set("sport", filters.sport);
  if (filters?.province) params.set("province", filters.province);
  if (filters?.verified) params.set("verified", "true");
  if (filters?.has_upcoming_competition) params.set("has_upcoming_competition", "true");
  const qs = params.toString();
  return apiFetch<AthleteCard[]>(`/athletes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
}

export type AthleteFacets = { sports: string[]; provinces: string[] };

export function getAthleteFacets() {
  return apiFetch<AthleteFacets>("/athletes/facets", { cache: "no-store" });
}

export function getAthlete(slug: string) {
  return apiFetch<AthleteProfile>(`/athletes/${slug}`, { cache: "no-store" });
}

export function getSports() {
  return apiFetch<string[]>("/sports", { cache: "no-store" });
}

export function reportAthlete(slug: string, payload: { reason: string; detail?: string }) {
  return apiFetch<{ id: string; status: string }>(`/athletes/${slug}/report`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitApplication(token: string, payload: ApplicationPayload) {
  return authedFetch<{ id: string; slug: string; status: string }>(token, "/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Direct-to-S3 uploads ---

type PresignedPost = { url: string; fields: Record<string, string>; s3_key: string };

// A presigned POST (not PUT) — the size cap the backend enforces via S3's
// content-length-range policy condition only exists on this form. The file
// must be the last field in the multipart body, per S3's POST policy rules.
async function postFileToS3(presigned: PresignedPost, file: File, errorMessage: string) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(presigned.fields)) formData.append(key, value);
  formData.append("file", file);
  const res = await fetch(presigned.url, { method: "POST", body: formData });
  if (!res.ok) {
    if (res.status === 400) throw new Error(`${errorMessage} (¿el archivo es demasiado grande?)`);
    throw new Error(errorMessage);
  }
}

// --- Profile photo upload — public, shown on the athlete's profile ---

export async function uploadProfilePhoto(token: string, file: File): Promise<string> {
  const presigned = await authedFetch<PresignedPost>(token, "/uploads/photo-url", {
    method: "POST",
    body: JSON.stringify({ filename: file.name, content_type: file.type }),
  });
  await postFileToS3(presigned, file, "No se pudo subir la foto");
  return presigned.s3_key;
}

// --- Local dev only: instant account switching, bypasses email entirely ---

export function devIssueOtp(email: string) {
  return apiFetch<{ email: string; token: string }>("/dev/otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// --- Admin ---

export function adminWhoAmI(token: string) {
  return authedFetch<{ email: string }>(token, "/admin/whoami");
}

export function adminListApplications(token: string) {
  return authedFetch<AdminAthleteListItem[]>(token, "/admin/applications");
}

// --- Invites: admin-prepared drafts a real athlete claims via a private link ---

export type InviteCreatePayload = {
  full_name: string;
  sport: string;
  discipline?: string;
  province?: string;
  city?: string;
  club?: string;
  instagram_handle?: string;
  bio?: string;
  instagram_posts: string[];
};

export type InviteLink = { athlete_id: string; slug: string; token: string };

export function adminCreateInvite(token: string, payload: InviteCreatePayload) {
  return authedFetch<InviteLink>(token, "/admin/invites", { method: "POST", body: JSON.stringify(payload) });
}

export function adminRegenerateInviteLink(token: string, athleteId: string) {
  return authedFetch<InviteLink>(token, `/admin/invites/${athleteId}/link`, { method: "POST" });
}

export function adminDeleteInvite(token: string, athleteId: string) {
  return authedFetch<void>(token, `/admin/invites/${athleteId}`, { method: "DELETE" });
}

export function getInvite(inviteToken: string) {
  return apiFetch<AthleteProfile>(`/invites/${encodeURIComponent(inviteToken)}`, { cache: "no-store" });
}

export function claimInvite(token: string, inviteToken: string, payload: ApplicationPayload) {
  return authedFetch<{ id: string; slug: string; status: string }>(
    token,
    `/invites/${encodeURIComponent(inviteToken)}/claim`,
    { method: "POST", body: JSON.stringify(payload) }
  );
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

export function adminPauseCampaign(token: string, campaignId: string, reason?: string) {
  return authedFetch<Campaign>(token, `/admin/campaigns/${campaignId}/pause`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || undefined }),
  });
}

export function adminResumeCampaign(token: string, campaignId: string) {
  return authedFetch<Campaign>(token, `/admin/campaigns/${campaignId}/resume`, { method: "POST" });
}

export function adminAuditLog(token: string, athleteId: string) {
  return authedFetch<AuditLogEntry[]>(token, `/admin/athletes/${athleteId}/audit-log`);
}

export function adminGetEvidenceDownloadUrl(token: string, athleteId: string, evidenceId: string) {
  return authedFetch<{ url: string }>(token, `/admin/athletes/${athleteId}/evidence/${evidenceId}/download-url`);
}

export function adminListExpiringCampaigns(token: string) {
  return authedFetch<CampaignAdminOut[]>(token, "/admin/campaigns/expiring");
}

export function adminListReports(token: string, status: "open" | "resolved" = "open") {
  return authedFetch<ReportOut[]>(token, `/admin/reports?status=${status}`);
}

export function adminResolveReport(token: string, reportId: string, note: string) {
  return authedFetch<ReportOut>(token, `/admin/reports/${reportId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function adminListSports(token: string) {
  return authedFetch<SportOption[]>(token, "/admin/sports");
}

export function adminCreateSport(token: string, name: string) {
  return authedFetch<SportOption>(token, "/admin/sports", { method: "POST", body: JSON.stringify({ name }) });
}

export function adminUpdateSport(token: string, sportId: string, active: boolean) {
  return authedFetch<SportOption>(token, `/admin/sports/${sportId}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
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

export function renewMyCampaign(token: string, campaignId: string, event_date: string) {
  return authedFetch<Campaign>(token, `/me/campaigns/${campaignId}/renew`, {
    method: "POST",
    body: JSON.stringify({ event_date }),
  });
}
