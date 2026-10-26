import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, ApiError } from "@/lib/api";
import { Figurita, placeLabel } from "@/components/figurita";
import { ProfileEditor } from "./profile-editor";
import { CampaignEditor } from "./campaign-editor";
import { SignOutButton } from "./sign-out-button";

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
    pending: "Tu figurita está en revisión. Mientras tanto podés completar tu perfil.",
    active: "Tu perfil está publicado en el álbum.",
    rejected: `Tu postulación no fue aprobada.${athlete.rejection_reason ? ` Motivo: ${athlete.rejection_reason}` : ""}`,
    suspended: `Tu perfil está suspendido por ahora.${athlete.suspended_reason ? ` Motivo: ${athlete.suspended_reason}` : ""}`,
  };

  const activeCampaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");
  const expiredCampaign = athlete.campaigns.find((c) => c.status === "expired");
  const draftCampaigns = athlete.campaigns.filter((c) => c.status === "draft");
  const pausedCampaign = athlete.campaigns.find((c) => c.status === "paused");

  return (
    <div>
      <section className="bg-celeste text-on-celeste">
        <div className="mx-auto flex max-w-4xl items-end gap-6 px-4 pt-8 pb-10 sm:px-6">
          <Figurita
            name={athlete.full_name}
            sport={athlete.sport}
            place={placeLabel(athlete)}
            photoUrl={athlete.photo_url}
            size="sm"
            className="hidden w-36 shrink-0 -rotate-2 sm:block"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[2.75rem] sm:text-[3.5rem]">Hola, {athlete.full_name.split(" ")[0]}</h1>
            <p className="mt-2 text-on-celeste/85">{statusMessage[athlete.status]}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
              {athlete.status === "active" && (
                <Link href={`/athletes/${athlete.slug}`} className="underline hover:no-underline">
                  Ver mi perfil público
                </Link>
              )}
              {athlete.status === "pending" && (
                <Link href="/apply" className="underline hover:no-underline">
                  Corregir mi postulación
                </Link>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {athlete.info_requested_message && (
          <div className="mb-10 rounded-xl bg-sol-soft p-5">
            <p className="font-semibold">Nuestro equipo te pidió más información:</p>
            <p className="mt-1">{athlete.info_requested_message}</p>
            <Link href="/apply" className="btn btn-primary btn-sm mt-4">
              Actualizar mi postulación
            </Link>
          </div>
        )}

        {athlete.status === "rejected" ? (
          <div className="rounded-xl border border-border p-5">
            {athlete.reapply_available_at && new Date(athlete.reapply_available_at) > new Date() ? (
              <p className="text-muted-foreground">
                Podés volver a enviarla a partir del {new Date(athlete.reapply_available_at).toLocaleString("es-AR")}.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">Podés corregir tu postulación y volver a enviarla cuando quieras.</p>
                <Link href="/apply" className="btn btn-primary mt-4">
                  Volver a enviarla
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-14">
            <ProfileEditor athlete={athlete} accessToken={session.access_token} />
            <div className="border-t border-border pt-12">
              <CampaignEditor
                accessToken={session.access_token}
                activeCampaign={activeCampaign}
                expiredCampaign={expiredCampaign}
                draftCampaigns={draftCampaigns}
                pausedCampaign={pausedCampaign}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
