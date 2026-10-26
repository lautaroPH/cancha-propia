import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAthlete } from "@/lib/api";
import { CheckIcon, Figurita, placeLabel } from "@/components/figurita";
import { InstagramEmbed, InstagramIcon } from "@/components/instagram-embed";
import { CopyButton } from "@/components/copy-button";
import { ReportButton } from "./report-button";

async function loadAthlete(slug: string) {
  try {
    return await getAthlete(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata(props: PageProps<"/athletes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const athlete = await loadAthlete(slug);
  if (!athlete) return {};

  const activeCampaign = athlete.campaigns.find((c) => c.status === "active");
  const description = activeCampaign
    ? `${activeCampaign.title} — ayudá a ${athlete.full_name} a llegar.`
    : `${athlete.sport} · ${placeLabel(athlete)}`;

  return {
    title: `${athlete.full_name} — ${athlete.sport}`,
    description,
    openGraph: {
      title: athlete.full_name,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: athlete.full_name,
      description,
    },
  };
}

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    amount
  );
}

function Seal({ label, active }: { label: string; active: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 text-sm ${active ? "font-semibold" : "text-on-celeste/60"}`}>
      <span
        className={`inline-flex size-5 items-center justify-center rounded-full ${
          active ? "bg-ink text-on-ink" : "border border-on-celeste/40"
        }`}
      >
        {active && <CheckIcon className="size-3" />}
      </span>
      {label}
      <span className="sr-only">{active ? "verificada" : "sin verificar"}</span>
    </li>
  );
}

export default async function AthleteProfilePage(props: PageProps<"/athletes/[slug]">) {
  const { slug } = await props.params;
  const athlete = await loadAthlete(slug);
  if (!athlete) notFound();

  const firstName = athlete.full_name.split(" ")[0];
  const campaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");
  const fullyVerified = athlete.identity_verified && athlete.career_verified && athlete.competition_verified;
  const facts = [
    ["Disciplina", athlete.discipline],
    ["Categoría", athlete.category],
    ["Club", athlete.club],
    ["Federación", athlete.federation],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const canHelp = Boolean(athlete.alias || athlete.raffle_url || athlete.whatsapp_number || athlete.instagram_handle);

  return (
    <div>
      <section className="bg-celeste text-on-celeste">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-12 sm:px-6 md:grid-cols-[260px_1fr] md:items-end md:pt-12">
          <Figurita
            name={athlete.full_name}
            sport={athlete.sport}
            place={placeLabel(athlete)}
            photoUrl={athlete.photo_url}
            verified={fullyVerified}
            campaign={Boolean(campaign)}
            size="md"
            className="mx-auto w-56 -rotate-2 md:mx-0 md:w-full"
          />
          <div>
            <h1 className="text-[3rem] sm:text-[4.5rem] lg:text-[5.5rem]">{athlete.full_name}</h1>
            <p className="mt-3 text-lg font-semibold">
              {athlete.sport} · {placeLabel(athlete)}
            </p>
            {athlete.bio && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-on-celeste/85">{athlete.bio}</p>}
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Sellos de verificación">
              <Seal label="Identidad" active={athlete.identity_verified} />
              <Seal label="Trayectoria" active={athlete.career_verified} />
              <Seal label="Competencia" active={athlete.competition_verified} />
            </ul>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px]">
        {(athlete.story || facts.length > 0) && (
          <section className="lg:col-start-1 lg:row-start-1">
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-4">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {athlete.story && (
              <>
                <h2 className="display mt-10 text-[2.25rem]">Mi historia</h2>
                <p className="mt-4 max-w-[68ch] text-lg leading-relaxed whitespace-pre-line text-foreground/90">
                  {athlete.story}
                </p>
              </>
            )}
          </section>
        )}

        {(campaign || canHelp) && (
          <aside className="space-y-6 lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              {campaign && (
                <section className="rounded-xl bg-sol-soft p-5">
                  <h2 className="display text-[1.75rem]">{campaign.title}</h2>
                  {campaign.event_date && (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {new Date(`${campaign.event_date}T12:00:00`).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {campaign.description && <p className="mt-3 leading-relaxed">{campaign.description}</p>}

                  <p className="mt-5 text-sm text-muted-foreground">Necesita</p>
                  <p className="display text-[2.5rem]">{money(campaign.goal_amount_ars)}</p>
                  {campaign.raised_amount_ars != null && (
                    <p className="text-sm text-muted-foreground">
                      {money(campaign.raised_amount_ars)} recaudados, según {firstName}
                    </p>
                  )}

                  {campaign.breakdown_items.length > 0 && (
                    <dl className="mt-4 space-y-1.5 border-t border-sol/40 pt-4">
                      {campaign.breakdown_items.map((item) => (
                        <div key={item.label} className="flex justify-between gap-4 text-sm">
                          <dt className="text-muted-foreground">{item.label}</dt>
                          <dd className="font-semibold">{money(item.amount_ars)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              )}

              {canHelp && (
                <section className="rounded-xl border border-border p-5">
                  <h2 className="display text-[1.75rem]">Cómo bancar a {firstName}</h2>
                  <div className="mt-4 space-y-5">
                    {athlete.alias && (
                      <div>
                        <p className="text-sm text-muted-foreground">Transferí directo a su alias</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="min-w-0 text-xl font-bold break-all">{athlete.alias}</p>
                          <CopyButton value={athlete.alias} label="Copiar alias" />
                        </div>
                        {athlete.cbu && <p className="mt-1 text-xs text-muted-foreground">CBU {athlete.cbu}</p>}
                      </div>
                    )}
                    {athlete.raffle_url && (
                      <div className="border-t border-border pt-5">
                        <p className="text-sm text-muted-foreground">Participá de su rifa</p>
                        {athlete.raffle_description && <p className="mt-1">{athlete.raffle_description}</p>}
                        <a
                          href={athlete.raffle_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block font-semibold text-accent underline hover:no-underline"
                        >
                          Ver la rifa
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          La organiza {firstName}, por fuera de Codeportistas.
                        </p>
                      </div>
                    )}
                    {(athlete.instagram_handle || athlete.whatsapp_number) && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                        {athlete.instagram_handle && (
                          <a
                            href={`https://instagram.com/${athlete.instagram_handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            <InstagramIcon className="size-4" />@{athlete.instagram_handle}
                          </a>
                        )}
                        {athlete.whatsapp_number && (
                          <a
                            href={`https://wa.me/${athlete.whatsapp_number.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                    Codeportistas no procesa ni retiene este dinero: va directo a {firstName}.
                  </p>
                </section>
              )}
            </div>
          </aside>
        )}

        {athlete.instagram_posts.length > 0 && (
          <section className="lg:col-start-1">
            <h2 className="display text-[2.25rem]">En Instagram</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {athlete.instagram_posts.map((url, i) => (
                <InstagramEmbed key={url} url={url} title={`Publicación ${i + 1} de ${athlete.full_name} en Instagram`} />
              ))}
            </div>
          </section>
        )}

        {athlete.achievements.length > 0 && (
          <section className="lg:col-start-1">
            <h2 className="display text-[2.25rem]">Logros</h2>
            <ol className="mt-5 divide-y divide-border border-y border-border">
              {athlete.achievements.map((a, i) => (
                <li key={i} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {a.date
                      ? new Date(`${a.date}T12:00:00`).toLocaleDateString("es-AR", { month: "short", year: "numeric" })
                      : "—"}
                  </span>
                  <span>
                    <span className="font-semibold">{a.title}</span>
                    {a.description && <span className="block text-muted-foreground">{a.description}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <ReportButton slug={athlete.slug} />
      </footer>
    </div>
  );
}
