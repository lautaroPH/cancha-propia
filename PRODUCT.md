# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Athletes** — Argentine high-performance athletes (adults and minors) who self-fund travel, gear and entry fees. They arrive on their phone, usually from Instagram, and want a public profile up with as little friction as possible. Many are teenagers; a minor holds their own account and only needs a guardian's email + consent.
- **Supporters** — people who land on an athlete's profile (often from a shared link) and decide whether to help, by transferring directly to the athlete's alias/CBU or joining their external raffle.
- **Admins** — a small team that reviews applications, approves campaigns and handles reports.

## Product Purpose

Codeportistas is a discovery and trust platform: one place where Argentine athletes tell their story, show their sport and ask for support, and where supporters can tell the profile is real. Success is an athlete going from "I heard about this" to a published profile in minutes, and a supporter trusting the page enough to help.

## Positioning

The platform never touches the money. Transfers go straight from supporter to athlete (alias/CBU) and raffles run outside the platform. What the platform adds is curation and review: every profile is checked by a person before it's published.

## Operating Context

- Signup is magic-link email login (Supabase), then a short application. No password, no ID documents.
- Review is manual. Since signup no longer collects a DNI, the reviewer verifies athletes against their public footprint: Instagram, federation pages, rankings and results.
- After applying, the athlete manages everything else themselves from the dashboard: photo, sport details, club, story, achievements, featured Instagram posts, payment alias, raffle link and campaigns.
- Campaigns (a goal with a cost breakdown and an event date) need admin approval before going live.

## Capabilities and Constraints

- Next.js 16 frontend (`apps/web`), FastAPI backend (`apps/api`), Postgres on Supabase, S3 for photos.
- Instagram content is shown through Instagram's official per-post embed, using links the athlete pastes. No scraping and no Graph API.
- Spanish (Argentina, voseo) is the product language throughout.
- Verification badges (identity, career, competition) are set by admins at review.

## Brand Commitments

- Name: **Codeportistas**.
- Argentine identity, chosen by the owner for the visual direction: national-sport energy without flag clichés.
- Voice: direct, warm, voseo ("Creá tu perfil", "Contá tu historia"); never charity-pity.

## Evidence on Hand

- One seeded sample athlete (`martina-lopez`). No real testimonials, totals raised, athlete counts or partner logos exist, and none should be invented.

## Product Principles

1. Fewest possible steps for the athlete: ask only what review needs, and let everything else live in the dashboard.
2. The athlete's own story and media lead the profile; the platform frames it.
3. Trust is shown, not claimed: badges mean a person checked something specific.
4. Money never flows through us, and the UI must make that obvious wherever support is asked for.

## Accessibility & Inclusion

Mobile-first: most athletes and supporters arrive on phones. Text must hold WCAG AA contrast in light and dark themes.
