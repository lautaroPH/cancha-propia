import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, ApiError } from "@/lib/api";
import { ProfileEditor } from "./profile-editor";
import { CampaignEditor } from "./campaign-editor";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/dashboard");

  let athlete;
  try {
    athlete = await getMe(session.access_token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/dashboard");
    // No application linked to this account yet — send them straight to the form
    // instead of making them click through an intermediate "no profile" screen.
    if (err instanceof ApiError && err.status === 403) redirect("/apply");
    throw err;
  }

  const statusMessage: Record<string, string> = {
    pending: "Tu postulación está en revisión.",
    active: "Tu perfil está publicado y visible en la plataforma.",
    rejected: `Tu postulación fue rechazada.${athlete.rejection_reason ? ` Motivo: ${athlete.rejection_reason}` : ""}`,
    suspended: `Tu perfil está suspendido temporalmente.${athlete.suspended_reason ? ` Motivo: ${athlete.suspended_reason}` : ""}`,
  };

  const activeCampaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");
  const expiredCampaign = athlete.campaigns.find((c) => c.status === "expired");
  const draftCampaigns = athlete.campaigns.filter((c) => c.status === "draft");
  const pausedCampaign = athlete.campaigns.find((c) => c.status === "paused");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Hola, {athlete.full_name.split(" ")[0]}</h1>
        {athlete.status === "active" && (
          <Link href={`/athletes/${athlete.slug}`} className="text-sm font-medium text-accent hover:underline">
            Ver mi perfil público →
          </Link>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{statusMessage[athlete.status]}</p>

      {athlete.info_requested_message && (
        <div className="mt-4 rounded-lg border border-accent bg-accent-soft px-4 py-3">
          <p className="text-sm font-medium text-accent-strong">Un administrador pidió más información:</p>
          <p className="mt-1 text-sm text-foreground/90">{athlete.info_requested_message}</p>
          <Link
            href="/apply"
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Actualizar mi postulación
          </Link>
        </div>
      )}

      {athlete.status === "rejected" ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          {athlete.reapply_available_at && new Date(athlete.reapply_available_at) > new Date() ? (
            <p className="text-sm text-muted-foreground">
              Podés volver a postularte a partir del{" "}
              {new Date(athlete.reapply_available_at).toLocaleString("es-AR")}.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Podés corregir tu postulación y volver a enviarla cuando quieras.
              </p>
              <Link
                href="/apply"
                className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Volver a postularme
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-3">
            <InfoField label="Deporte" value={athlete.sport} />
            <InfoField label="Categoría" value={athlete.category} />
            <InfoField label="Disciplina" value={athlete.discipline} />
            <InfoField label="Provincia" value={athlete.province} />
            <InfoField label="Ciudad" value={athlete.city} />
            <InfoField label="Club" value={athlete.club} />
            <InfoField label="Federación" value={athlete.federation} />
            <InfoField label="Fecha de nacimiento" value={athlete.date_of_birth} />
          </section>
          <p className="mt-2 text-xs text-muted-foreground">
            {athlete.status === "pending" ? (
              <>
                ¿Necesitás corregir deporte, DNI, club u otro dato de tu postulación?{" "}
                <Link href="/apply" className="text-accent hover:underline">
                  Editá tu postulación
                </Link>
                .
              </>
            ) : (
              "Para cambiar deporte, club, federación o categoría escribinos — esos cambios requieren una nueva revisión, así que no se editan directo desde acá."
            )}
          </p>

          <ProfileEditor athlete={athlete} accessToken={session.access_token} />

          <CampaignEditor
            accessToken={session.access_token}
            activeCampaign={activeCampaign}
            expiredCampaign={expiredCampaign}
            draftCampaigns={draftCampaigns}
            pausedCampaign={pausedCampaign}
          />
        </>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground">{value ?? "—"}</p>
    </div>
  );
}
