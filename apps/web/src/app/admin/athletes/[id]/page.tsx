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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[2.5rem] sm:text-[3rem]">{athlete.full_name}</h1>
          <p className="mt-1 text-muted-foreground">
            {athlete.sport}
            {athlete.discipline ? ` · ${athlete.discipline}` : ""} · {athlete.province ?? "—"}
          </p>
        </div>
        <StatusPill status={athlete.status} />
      </div>

      {athlete.is_minor && (
        <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          Atleta menor de edad — consentimiento de {athlete.guardian_email ?? "—"}
          {athlete.guardian_consent_at
            ? ` el ${new Date(athlete.guardian_consent_at).toLocaleString("es-AR")}`
            : " (sin confirmar)"}
        </p>
      )}

      <section className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Fecha de nacimiento</p>
          <p className="text-foreground">{athlete.date_of_birth}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email de contacto</p>
          <p className="text-foreground">{athlete.contact_email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Club</p>
          <p className="text-foreground">{athlete.club ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Federación</p>
          <p className="text-foreground">
            {athlete.federation ?? "—"}
            {athlete.federation_license_number ? ` (Nº ${athlete.federation_license_number})` : ""}
          </p>
        </div>
      </section>

      {athlete.story && (
        <section className="mt-6">
          <h2 className="group-title text-[1.125rem]">Historia</h2>
          <p className="mt-1 whitespace-pre-line text-foreground/90">{athlete.story}</p>
        </section>
      )}

      <section className="mt-8 rounded-xl bg-celeste-soft p-5">
        <h2 className="group-title text-[1.125rem]">Para verificar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No se pide DNI: verificá contra su Instagram y los links que dejó.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {athlete.instagram_handle ? (
            <li>
              <a
                href={`https://instagram.com/${athlete.instagram_handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-accent underline hover:no-underline"
              >
                <InstagramIcon className="size-4" />@{athlete.instagram_handle}
              </a>
            </li>
          ) : (
            <li className="text-muted-foreground">Sin Instagram.</li>
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

      {athlete.admin_notes && (
        <section className="mt-6">
          <h2 className="group-title text-[1.125rem]">Notas internas</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{athlete.admin_notes}</p>
        </section>
      )}

      {athlete.campaigns.length > 0 && (
        <section className="mt-6">
          <h2 className="group-title text-[1.125rem]">Campañas</h2>
          <CampaignApprovals campaigns={athlete.campaigns} accessToken={session.access_token} />
        </section>
      )}

      <ReviewActions athleteId={athlete.id} accessToken={session.access_token} status={athlete.status} />

      {auditLog.length > 0 && (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="group-title text-[1.125rem]">Historial</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
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
  );
}
