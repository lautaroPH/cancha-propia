import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAthlete } from "@/lib/api";

async function loadAthlete(slug: string) {
  try {
    return await getAthlete(slug);
  } catch {
    return null;
  }
}

function location(athlete: { city: string | null; province: string | null }): string {
  return [athlete.city, athlete.province].filter(Boolean).join(", ") || "Argentina";
}

export async function generateMetadata(props: PageProps<"/athletes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const athlete = await loadAthlete(slug);
  if (!athlete) return {};

  const activeCampaign = athlete.campaigns.find((c) => c.status === "active");
  const description = activeCampaign
    ? `${activeCampaign.title} — ayudá a ${athlete.full_name} a llegar.`
    : `${athlete.sport} · ${location(athlete)}`;

  return {
    title: `${athlete.full_name} — ${athlete.sport}`,
    description,
    openGraph: {
      title: athlete.full_name,
      description,
      images: athlete.photo_url ? [{ url: athlete.photo_url, width: 1200, height: 630 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: athlete.full_name,
      description,
      images: athlete.photo_url ? [athlete.photo_url] : [],
    },
  };
}

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    amount
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-verified-soft text-verified" : "bg-surface-muted text-muted-foreground"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}

export default async function AthleteProfilePage(props: PageProps<"/athletes/[slug]">) {
  const { slug } = await props.params;
  const athlete = await loadAthlete(slug);
  if (!athlete) notFound();

  const campaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="size-32 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          {athlete.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={athlete.photo_url} alt={athlete.full_name} className="size-full object-cover" />
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{athlete.full_name}</h1>
          <p className="mt-1 text-muted-foreground">
            {athlete.sport}
            {athlete.discipline ? ` · ${athlete.discipline}` : ""} · {location(athlete)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label="Identidad verificada" active={athlete.identity_verified} />
            <Badge label="Trayectoria verificada" active={athlete.career_verified} />
            <Badge label="Competencia verificada" active={athlete.competition_verified} />
          </div>
        </div>
      </div>

      {athlete.story && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Mi historia</h2>
          <p className="mt-2 whitespace-pre-line text-foreground/90">{athlete.story}</p>
        </section>
      )}

      {athlete.achievements.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Logros</h2>
          <ul className="mt-3 space-y-2">
            {athlete.achievements.map((a, i) => (
              <li key={i} className="flex gap-3 text-foreground/90">
                {a.date && (
                  <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">
                    {new Date(a.date).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                <span>
                  <span className="font-medium">{a.title}</span>
                  {a.description ? ` — ${a.description}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {campaign && (
        <section className="mt-10 rounded-xl border border-accent-soft bg-accent-soft/50 p-6">
          <h2 className="text-lg font-semibold text-foreground">{campaign.title}</h2>
          {campaign.event_date && (
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(campaign.event_date).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {campaign.description && <p className="mt-3 text-foreground/90">{campaign.description}</p>}

          <p className="mt-4 text-2xl font-bold text-foreground">{money(campaign.goal_amount_ars)}</p>
          {campaign.raised_amount_ars != null && (
            <p className="text-sm text-muted-foreground">
              {money(campaign.raised_amount_ars)} recaudados (autoreportado por {athlete.full_name.split(" ")[0]})
            </p>
          )}

          {campaign.breakdown_items.length > 0 && (
            <dl className="mt-4 space-y-1.5 border-t border-accent-soft pt-4">
              {campaign.breakdown_items.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-mono text-foreground">{money(item.amount_ars)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {(athlete.alias || athlete.instagram_handle || athlete.whatsapp_number) && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">¿Cómo podés ayudar?</h2>
          <div className="mt-3 space-y-3">
            {athlete.alias && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">Transferí directo a su alias</p>
                <p className="mt-1 font-mono text-lg font-semibold text-foreground">{athlete.alias}</p>
                {athlete.cbu && (
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">CBU: {athlete.cbu}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  La plataforma no procesa ni retiene este dinero — la transferencia va directo al atleta.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {athlete.instagram_handle && (
                <a
                  href={`https://instagram.com/${athlete.instagram_handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
                >
                  Instagram
                </a>
              )}
              {athlete.whatsapp_number && (
                <a
                  href={`https://wa.me/${athlete.whatsapp_number.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
