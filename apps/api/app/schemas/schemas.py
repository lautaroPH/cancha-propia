import uuid
from datetime import date
from datetime import date as _date  # avoids self-shadowing on the `date` field below
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str
    date_of_birth: date
    national_id: str = Field(min_length=4)  # hashed on write, never stored in plaintext

    province: str | None = None
    city: str | None = None
    sport: str
    discipline: str | None = None
    category: str | None = None
    club: str | None = None
    federation: str | None = None
    federation_license_number: str | None = None

    bio: str | None = None
    story: str | None = None
    # No contact_email here on purpose — it's derived server-side from the
    # authenticated session, always, even for a minor (they hold their own
    # account — see plan discussion on simplifying the guardian flow).

    evidence_links: list[str] = Field(default_factory=list)  # federation/ranking/result URLs submitted at intake

    # A minor doesn't manage a separate guardian account — this is just the
    # legally necessary bit: who authorized the profile, captured once here.
    guardian_email: EmailStr | None = None
    guardian_consent: bool = False

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
    def evidence_required(self) -> "ApplicationCreate":
        # Without at least one link there's nothing for an admin to verify
        # identity/career against — an empty application can't be reviewed.
        if not any(link.strip() for link in self.evidence_links):
            raise ValueError(
                "At least one evidence link is required (federation page, ranking, results, social media, etc.)"
            )
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
    whatsapp_number: str | None
    alias: str | None
    cbu: str | None

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
    kind: str
    s3_key: str
    original_filename: str | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


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
    evidence: list[EvidenceFileOut]


class AthleteSelfView(AthleteAdminView):
    """What an athlete/guardian sees about their own profile — same as admin
    minus admin-only commentary (admin_notes). Includes their own evidence so
    a rejected applicant can see what they submitted when resubmitting."""

    instagram_public: bool
    whatsapp_public: bool
    alias_public: bool
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
    """Free-edit fields only — see plan §2 for what requires re-review instead."""

    bio: str | None = None
    story: str | None = None
    achievements: list[AchievementIn] | None = None
    photo_s3_key: str | None = None
    instagram_handle: str | None = None
    instagram_public: bool | None = None
    whatsapp_number: str | None = None
    whatsapp_public: bool | None = None
    alias: str | None = None
    cbu: str | None = None
    alias_public: bool | None = None

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
