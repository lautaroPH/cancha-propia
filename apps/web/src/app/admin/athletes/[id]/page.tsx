import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminGetAthlete, adminAuditLog, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";
import { CampaignApprovals } from "./campaign-approvals";
import { ReviewActions } from "./review-actions";
import { ViewEvidenceButton } from "./view-evidence-button";
import { StatusPill } from "@/components/admin-nav";
import { InstagramIcon } from "@/components/instagram-embed";
import { Figurita, placeLabel } from "@/components/figurita";

function ageInYears(birthDate: Date) {
  return Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default async function AdminAthleteDetailPage(props: PageProps<"/admin/athletes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=/admin/athletes/${id}`);

  let athlete;
  try {
    athlete = await adminGetAthlete(session.access_token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 401) redirect(`/login?next=/admin/athletes/${id}`);
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }
  const auditLog = await adminAuditLog(session.access_token, id);

  // Null only on an unclaimed invite — the athlete fills it in when claiming.
  const birthDate = athlete.date_of_birth ? new Date(`${athlete.date_of_birth}T12:00:00`) : null;
  const facts: [string, string | null][] = [
    ["Edad", birthDate ? `${ageInYears(birthDate)} años (${birthDate.toLocaleDateString("es-AR")})` : null],
    ["Email", athlete.contact_email],
    ["Ubicación", placeLabel(athlete)],
    ["Disciplina", athlete.discipline],
    ["Categoría", athlete.category],
    ["Club", athlete.club],
    [
      "Federación",
      athlete.federation
        ? `${athlete.federation}${athlete.federation_license_number ? ` (Nº ${athlete.federation_license_number})` : ""}`
        : null,
    ],
    ["Postuló", new Date(athlete.created_at).toLocaleDateString("es-AR")],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-end gap-5">
        <Figurita
          name={athlete.full_name}
          sport={athlete.sport}
          place={placeLabel(athlete)}
          photoUrl={athlete.photo_url}
          size="sm"
          className="hidden w-36 shrink-0 -rotate-2 sm:block"
        />
        <div className="min-w-0 flex-1">
          <StatusPill status={athlete.status} />
          <h1 className="mt-2 text-[2.5rem] sm:text-[3rem]">{athlete.full_name}</h1>
          <p className="mt-1 font-semibold text-muted-foreground">{athlete.sport}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {athlete.is_minor && (
            <p className="rounded-lg bg-sol-soft px-4 py-3 text-sm">
              <span className="font-semibold">Menor de edad.</span> Autorizó {athlete.guardian_email ?? "—"}
              {athlete.guardian_consent_at
                ? ` el ${new Date(athlete.guardian_consent_at).toLocaleString("es-AR")}.`
                : " (sin confirmar)."}
            </p>
          )}

          {athlete.info_requested_message && athlete.status === "pending" && (
            <p className="rounded-lg border border-border px-4 py-3 text-sm">
              <span className="font-semibold">Le pedimos más info:</span> {athlete.info_requested_message}
            </p>
          )}

          <section className="rounded-xl bg-celeste-soft p-5">
            <h2 className="group-title">Para verificar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No se pide DNI: verificá contra su Instagram y los links que dejó.
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {athlete.instagram_handle ? (
                <li>
                  <a
                    href={`https://instagram.com/${athlete.instagram_handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-base font-semibold text-accent underline hover:no-underline"
                  >
                    <InstagramIcon className="size-5" />@{athlete.instagram_handle}
                  </a>
                </li>
              ) : (
                <li className="font-semibold text-danger">Sin Instagram: verificá con los links.</li>
              )}
              {athlete.instagram_posts.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className="break-all text-accent underline hover:no-underline">
                    {url}
                  </a>{" "}
                  <span className="text-muted-foreground">(publicación destacada)</span>
                </li>
              ))}
              {athlete.evidence.map((e) => (
                <li key={e.id} className="break-all">
                  {e.kind === "federation_link" ? (
                    <a href={e.s3_key} target="_blank" rel="noreferrer" className="text-accent underline hover:no-underline">
                      {e.s3_key}
                    </a>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Documento anterior ({e.kind}):</span>{" "}
                      <span>{e.original_filename ?? "documento"}</span>{" "}
                      <ViewEvidenceButton athleteId={athlete.id} evidenceId={e.id} accessToken={session.access_token} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="group-title">Datos</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold break-words">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(athlete.bio || athlete.story) && (
            <section>
              <h2 className="group-title">Su historia</h2>
              {athlete.bio && <p className="mt-3 font-semibold">{athlete.bio}</p>}
              {athlete.story && (
                <p className="mt-2 max-w-[68ch] leading-relaxed whitespace-pre-line text-foreground/90">{athlete.story}</p>
              )}
            </section>
          )}

          {athlete.admin_notes && (
            <section>
              <h2 className="group-title">Notas internas</h2>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground/90">{athlete.admin_notes}</p>
            </section>
          )}

          {athlete.campaigns.length > 0 && (
            <section>
              <h2 className="group-title">Campañas</h2>
              <CampaignApprovals campaigns={athlete.campaigns} accessToken={session.access_token} />
            </section>
          )}

          {auditLog.length > 0 && (
            <section>
              <h2 className="group-title">Historial</h2>
              <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                {auditLog.map((entry, i) => (
                  <li key={i} className="text-muted-foreground">
                    <span className="text-xs">{new Date(entry.created_at).toLocaleString("es-AR")}</span>{" "}
                    — <span className="text-foreground">{entry.action}</span> por {entry.admin_email}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ReviewActions athleteId={athlete.id} accessToken={session.access_token} status={athlete.status} />
        </aside>
      </div>
    </div>
  );
}
