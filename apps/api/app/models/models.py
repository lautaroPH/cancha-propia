import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

AthleteStatus = ENUM("pending", "active", "rejected", "suspended", name="athlete_status", create_type=False)
CampaignStatus = ENUM(
    "draft", "active", "grace", "closed", "expired", "paused", name="campaign_status", create_type=False
)
EvidenceKind = ENUM(
    "id_document", "selfie_with_id", "federation_link", "competition_result", "ranking", "photo", "other",
    name="evidence_kind", create_type=False,
)
ReportStatus = ENUM("open", "resolved", name="report_status", create_type=False)



class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Athlete(Base):
    __tablename__ = "athlete"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True, nullable=True)
    slug: Mapped[str] = mapped_column(Text, unique=True)
    status: Mapped[str] = mapped_column(AthleteStatus, default="pending")

    full_name: Mapped[str] = mapped_column(Text)
    date_of_birth: Mapped[date] = mapped_column(Date)
    is_minor: Mapped[bool] = mapped_column(default=False)

    province: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    sport: Mapped[str] = mapped_column(Text)
    discipline: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    club: Mapped[str | None] = mapped_column(Text, nullable=True)
    federation: Mapped[str | None] = mapped_column(Text, nullable=True)
    federation_license_number: Mapped[str | None] = mapped_column(Text, nullable=True)

    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    achievements: Mapped[list] = mapped_column(JSONB, default=list)
    photo_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    # A minor's guardian is intentionally NOT a separate account/entity — the
    # minor manages their own login and profile. This is just the legally
    # necessary bit: who authorized it, and when. See migration 0005.
    guardian_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    guardian_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    identity_verified: Mapped[bool] = mapped_column(default=False)
    identity_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    identity_verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    career_verified: Mapped[bool] = mapped_column(default=False)
    career_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    career_verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    competition_verified: Mapped[bool] = mapped_column(default=False)
    competition_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    competition_verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    next_review_due: Mapped[date | None] = mapped_column(Date, nullable=True)

    instagram_handle: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_public: Mapped[bool] = mapped_column(default=False)
    whatsapp_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    whatsapp_public: Mapped[bool] = mapped_column(default=False)
    alias: Mapped[str | None] = mapped_column(Text, nullable=True)
    cbu: Mapped[str | None] = mapped_column(Text, nullable=True)
    alias_public: Mapped[bool] = mapped_column(default=False)

    # External only — the plan explicitly cuts an internal raffle system.
    # This just displays a link to wherever the athlete runs their own raffle.
    raffle_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raffle_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    raffle_public: Mapped[bool] = mapped_column(default=False)

    national_id_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str] = mapped_column(Text)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Athlete-visible — unlike admin_notes, which is internal commentary only.
    info_requested_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    info_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="athlete", order_by="Campaign.created_at.desc()")


class Campaign(Base):
    __tablename__ = "campaign"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("athlete.id", ondelete="CASCADE"))
    athlete: Mapped[Athlete] = relationship(back_populates="campaigns")

    status: Mapped[str] = mapped_column(CampaignStatus, default="draft")
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    goal_amount_ars: Mapped[int] = mapped_column(Integer)
    raised_amount_ars: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grace_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    breakdown_items: Mapped[list["CampaignBreakdownItem"]] = relationship(
        back_populates="campaign", order_by="CampaignBreakdownItem.sort_order"
    )


class CampaignBreakdownItem(Base):
    __tablename__ = "campaign_breakdown_item"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaign.id", ondelete="CASCADE"))
    campaign: Mapped[Campaign] = relationship(back_populates="breakdown_items")

    label: Mapped[str] = mapped_column(Text)
    amount_ars: Mapped[int] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class EvidenceFile(Base):
    __tablename__ = "evidence_file"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("athlete.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(EvidenceKind)
    s3_key: Mapped[str] = mapped_column(Text)
    original_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "report"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("athlete.id", ondelete="CASCADE"))
    reason: Mapped[str] = mapped_column(Text)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(ReportStatus, default="open")
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    resolved_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SportOption(Base):
    """Admin-managed canonical sport list (plan §12 phase 5: "so you're not
    hardcoding sport lists"). Suggestions only — the athlete's `sport` field
    stays free-text, this just drives the apply form's datalist."""

    __tablename__ = "sport_option"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, unique=True)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("admin_user.id"))
    athlete_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("athlete.id"), nullable=True)
    action: Mapped[str] = mapped_column(Text)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
