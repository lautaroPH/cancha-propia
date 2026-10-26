import { ImageResponse } from "next/og";
import { getAthlete } from "@/lib/api";

export const alt = "Perfil de atleta en Codeportistas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  background: "#74acdf",
  surface: "#ffffff",
  foreground: "#0e1b33",
  muted: "#26405f",
  border: "#0e1b33",
  accent: "#0e1b33",
  accentForeground: "#ffffff",
  accentSoft: "#f6b40e",
  verified: "#1b7a4b",
  verifiedSoft: "#dcf1e4",
};

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    amount
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const athlete = await getAthlete(slug).catch(() => null);

  if (!athlete) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: COLORS.background,
            color: COLORS.foreground,
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Codeportistas
        </div>
      ),
      size
    );
  }

  const location = [athlete.city, athlete.province].filter(Boolean).join(", ") || "Argentina";
  const fullyVerified = athlete.identity_verified && athlete.career_verified && athlete.competition_verified;
  const campaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: COLORS.background,
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexShrink: 0 }}>
          {athlete.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={athlete.photo_url}
              width={300}
              height={300}
              style={{ borderRadius: "50%", objectFit: "cover", border: `6px solid ${COLORS.accent}` }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 300,
                height: 300,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: COLORS.accentSoft,
                color: COLORS.accent,
                fontSize: 96,
                fontWeight: 700,
                border: `6px solid ${COLORS.accent}`,
              }}
            >
              {initials(athlete.full_name)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 56, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 2, color: COLORS.accent }}>
            CODEPORTISTAS
          </div>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: COLORS.foreground, marginTop: 14 }}>
            {athlete.full_name}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: COLORS.muted, marginTop: 10 }}>
            {athlete.sport}
            {athlete.discipline ? ` · ${athlete.discipline}` : ""} · {location}
          </div>

          {fullyVerified && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 24,
                padding: "10px 20px",
                borderRadius: 999,
                background: COLORS.verifiedSoft,
                color: COLORS.verified,
                fontSize: 26,
                fontWeight: 600,
                width: "fit-content",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 20 20" fill={COLORS.verified}>
                <path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" />
              </svg>
              Perfil verificado
            </div>
          )}

          {campaign && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 32,
                padding: 28,
                borderRadius: 20,
                background: COLORS.surface,
                border: `2px solid ${COLORS.border}`,
                maxWidth: 680,
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: COLORS.foreground }}>
                {campaign.title}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: COLORS.accent, marginTop: 8, fontWeight: 700 }}>
                Objetivo: {money(campaign.goal_amount_ars)}
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
