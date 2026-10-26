import re
import uuid
from datetime import date
from datetime import date as _date  # avoids self-shadowing on the `date` field below
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

MAX_INSTAGRAM_POSTS = 6

_INSTAGRAM_HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")
# Post, reel or IGTV permalink — the only shapes Instagram's /embed endpoint serves.
_INSTAGRAM_POST_RE = re.compile(
    r"^https?://(?:www\.)?instagram\.com/(?:[A-Za-z0-9._]+/)?(p|reel|reels|tv)/([A-Za-z0-9_-]+)/?(?:[?#].*)?$"
)


def _is_http_url(value: str) -> bool:
    # Both evidence_links and raffle_url get rendered as raw <a href> — without
    # this, a javascript: URI would be a stored XSS on click (public profile
    # for raffle_url, admin review page for evidence_links).
    return value.startswith("http://") or value.startswith("https://")


def normalize_instagram_handle(value: str | None) -> str | None:
    """Accepts "@martina", "martina" or a pasted profile URL; stores the bare handle."""
    if value is None:
        return None
    handle = value.strip()
    handle = re.sub(r"^https?://(?:www\.)?instagram\.com/", "", handle).split("?")[0].strip("/")
    handle = handle.lstrip("@")
    if not handle:
        return None
    if not _INSTAGRAM_HANDLE_RE.match(handle):
        raise ValueError("instagram_handle must be a valid Instagram username")
    return handle


def normalize_instagram_post(url: str) -> str:
    """Canonical permalink, so the frontend can build the /embed URL without
    re-parsing whatever tracking params the share sheet appended."""
    match = _INSTAGRAM_POST_RE.match(url.strip())
    if not match:
        raise ValueError("instagram_posts must be Instagram post or reel links")
    kind, code = match.groups()
    kind = "reel" if kind == "reels" else kind
    return f"https://www.instagram.com/{kind}/{code}/"


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1)
    date_of_birth: date

    province: str | None = None
    city: str | None = None
    sport: str = Field(min_length=1)

    instagram_handle: str | None = None
    bio: str | None = None
    # No contact_email here on purpose — it's derived server-side from the
    # authenticated session, always, even for a minor (they hold their own
    # account — see plan discussion on simplifying the guardian flow).

    evidence_links: list[str] = Field(default_factory=list)  # federation/ranking/result URLs, optional

    # A minor doesn't manage a separate guardian account — this is just the
    # legally necessary bit: who authorized the profile, captured once here.
    guardian_email: EmailStr | None = None
    guardian_consent: bool = False

    _normalize_handle = field_validator("instagram_handle")(normalize_instagram_handle)

    @model_validator(mode="after")
    def guardian_consent_required_if_minor(self) -> "ApplicationCreate":
        age_years = (date.today() - self.date_of_birth).days / 365.25
        if age_years < 18:
            if not self.guardian_email:
                raise ValueError("guardian_email is required for applicants under 18")
            if not self.guardian_consent:
                raise ValueError("guardian consent is required for applicants under 18")
        return self

    @model_validator(mode="after")
    def something_to_verify(self) -> "ApplicationCreate":
        # The reviewer verifies the athlete against their public footprint —
        # without an Instagram or at least one link there's nothing to check.
        self.evidence_links = [link.strip() for link in self.evidence_links if link.strip()]
        if not self.instagram_handle and not self.evidence_links:
            raise ValueError("Add your Instagram or at least one link (federation, ranking, results...)")
        if any(not _is_http_url(link) for link in self.evidence_links):
            raise ValueError("Evidence links must be http:// or https:// URLs")
        return self


class ApplicationCreated(BaseModel):
    id: uuid.UUID
    slug: str
    status: str


class CampaignBreakdownItemOut(BaseModel):
    label: str
    amount_ars: int

    model_config = {"from_attributes": True}


class CampaignOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    event_date: date | None
    status: str
    goal_amount_ars: int
    raised_amount_ars: int | None
    breakdown_items: list[CampaignBreakdownItemOut]

    model_config = {"from_attributes": True}


class AthleteFacets(BaseModel):
    sports: list[str]
    provinces: list[str]


class AthleteCard(BaseModel):
    """Directory listing — trimmed for list views."""

    slug: str
    full_name: str
    photo_url: str | None
    province: str | None
    city: str | None
    sport: str
    discipline: str | None
    identity_verified: bool
    career_verified: bool
    competition_verified: bool
    has_active_campaign: bool

    model_config = {"from_attributes": True}


class AthleteProfile(BaseModel):
    """Public profile — only fields cleared for public display."""

    slug: str
    full_name: str
    photo_url: str | None
    province: str | None
    city: str | None
    sport: str
    discipline: str | None
    category: str | None
    club: str | None
    federation: str | None

    bio: str | None
    story: str | None
    achievements: list[dict]

    identity_verified: bool
    career_verified: bool
    competition_verified: bool

    instagram_handle: str | None
    instagram_posts: list[str]
    whatsapp_number: str | None
    alias: str | None
    cbu: str | None
    raffle_url: str | None
    raffle_description: str | None

    campaigns: list[CampaignOut]


class AthleteAdminView(AthleteProfile):
    """Everything the public sees, plus what only an admin should see."""

    id: uuid.UUID
    status: str
    date_of_birth: date
    is_minor: bool
    federation_license_number: str | None
    contact_email: str
    guardian_email: str | None
    guardian_consent_at: datetime | None
    rejection_reason: str | None
    rejected_at: datetime | None
    reapply_available_at: datetime | None
    info_requested_message: str | None
    info_requested_at: datetime | None
    suspended_reason: str | None
    suspended_at: datetime | None
    admin_notes: str | None
    next_review_due: date | None
    created_at: datetime


class AdminAthleteListItem(BaseModel):
    id: uuid.UUID
    slug: str
    full_name: str
    status: str
    sport: str
    province: str | None
    identity_verified: bool
    career_verified: bool
    competition_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceFileOut(BaseModel):
    id: uuid.UUID
    kind: str
    s3_key: str
    original_filename: str | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class EvidenceUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)


class EvidenceUploadResponse(BaseModel):
    url: str
    fields: dict[str, str]
    s3_key: str


class EvidenceDownloadUrl(BaseModel):
    url: str


class AuditLogEntryOut(BaseModel):
    action: str
    detail: dict | None
    admin_email: str
    created_at: datetime


class AthleteAdminDetail(AthleteAdminView):
    """Full admin detail view — unlike AthleteAdminView, contact fields are never
    gated by the athlete's public/private toggle, and includes evidence."""

    instagram_public: bool
    whatsapp_public: bool
    alias_public: bool
    raffle_public: bool
    evidence: list[EvidenceFileOut]


class AthleteSelfView(AthleteAdminView):
    """What an athlete/guardian sees about their own profile — same as admin
    minus admin-only commentary (admin_notes). Includes their own evidence so
    a rejected applicant can see what they submitted when resubmitting."""

    instagram_public: bool
    whatsapp_public: bool
    alias_public: bool
    raffle_public: bool
    evidence: list[EvidenceFileOut]

    model_config = {"from_attributes": False}


class ApproveRequest(BaseModel):
    identity_verified: bool = False
    career_verified: bool = False
    competition_verified: bool = False
    notes: str | None = None


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1)


class SuspendRequest(BaseModel):
    reason: str = Field(min_length=1)


class RequestInfoRequest(BaseModel):
    message: str = Field(min_length=1)


class AchievementIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    date: _date | None = None
    description: str | None = None


class AthleteSelfUpdate(BaseModel):
    """Everything the athlete owns on their profile. Name and date of birth stay
    out — those are what the reviewer verified, so they don't change silently."""

    sport: str | None = Field(default=None, min_length=1)
    discipline: str | None = None
    category: str | None = None
    province: str | None = None
    city: str | None = None
    club: str | None = None
    federation: str | None = None
    bio: str | None = None
    story: str | None = None
    achievements: list[AchievementIn] | None = None
    photo_s3_key: str | None = None
    instagram_handle: str | None = None
    instagram_public: bool | None = None
    instagram_posts: list[str] | None = Field(default=None, max_length=MAX_INSTAGRAM_POSTS)
    whatsapp_number: str | None = None
    whatsapp_public: bool | None = None
    alias: str | None = None
    cbu: str | None = None
    alias_public: bool | None = None
    # External only — plan explicitly cuts an internal raffle system, this is
    # just a link-out to wherever the athlete runs their own.
    raffle_url: str | None = None
    raffle_description: str | None = None
    raffle_public: bool | None = None

    _normalize_handle = field_validator("instagram_handle")(normalize_instagram_handle)

    @field_validator("instagram_posts")
    @classmethod
    def _normalize_posts(cls, posts: list[str] | None) -> list[str] | None:
        if posts is None:
            return None
        normalized = [normalize_instagram_post(p) for p in posts if p.strip()]
        return list(dict.fromkeys(normalized))  # drop duplicates, keep the athlete's order

    @model_validator(mode="after")
    def public_toggles_need_a_value(self) -> "AthleteSelfUpdate":
        # A "public" toggle with nothing behind it just shows an empty field
        # on the profile — require the value alongside the toggle.
        if self.instagram_public and not self.instagram_handle:
            raise ValueError("instagram_handle is required to make Instagram public")
        if self.whatsapp_public and not self.whatsapp_number:
            raise ValueError("whatsapp_number is required to make WhatsApp public")
        if self.alias_public and not self.alias:
            raise ValueError("alias is required to make payment info public")
        if self.raffle_public and not self.raffle_url:
            raise ValueError("raffle_url is required to make the raffle public")
        if self.raffle_url and not _is_http_url(self.raffle_url):
            raise ValueError("raffle_url must be an http:// or https:// URL")
        return self


class CampaignBreakdownItemIn(BaseModel):
    label: str
    amount_ars: int


class CampaignCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: date | None = None
    goal_amount_ars: int
    breakdown: list[CampaignBreakdownItemIn] = Field(default_factory=list)


class CampaignRaisedUpdate(BaseModel):
    raised_amount_ars: int


class CampaignPauseRequest(BaseModel):
    reason: str | None = None


class CampaignRenewRequest(BaseModel):
    event_date: date

    @model_validator(mode="after")
    def must_be_future(self) -> "CampaignRenewRequest":
        if self.event_date < date.today():
            raise ValueError("event_date must be in the future")
        return self


class CampaignAdminOut(CampaignOut):
    """A campaign plus enough athlete context to act on it from a queue that
    isn't scoped to one athlete (e.g. the expiry queue)."""

    athlete_id: uuid.UUID
    athlete_slug: str
    athlete_full_name: str


REPORT_REASONS = (
    "Información falsa o engañosa",
    "Suplantación de identidad",
    "Contenido inapropiado",
    "Perfil duplicado",
    "Otro",
)


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=1, max_length=80)
    detail: str | None = Field(default=None, max_length=2000)


class ReportCreated(BaseModel):
    id: uuid.UUID
    status: str


class ReportOut(BaseModel):
    id: uuid.UUID
    athlete_id: uuid.UUID
    athlete_slug: str
    athlete_full_name: str
    reason: str
    detail: str | None
    status: str
    resolved_note: str | None
    resolved_at: datetime | None
    created_at: datetime


class ReportResolveRequest(BaseModel):
    note: str = Field(min_length=1)


class SportOptionOut(BaseModel):
    id: uuid.UUID
    name: str
    active: bool

    model_config = {"from_attributes": True}


class SportOptionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)


class SportOptionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: bool
