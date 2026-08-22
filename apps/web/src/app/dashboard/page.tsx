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
    if (err instanceof ApiError && err.status === 403) {
      return (
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="text-xl font-bold text-foreground">No encontramos tu perfil</h1>
          <p className="mt-3 text-muted-foreground">
            Esta cuenta ({session.user.email}) todavía no tiene una postulación asociada.
          </p>
          <Link
            href="/apply"
            className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground hover:opacity-90"
          >
            Postularme
          </Link>
        </div>
      );
    }
    throw err;
  }

  const statusMessage: Record<string, string> = {
    pending: "Tu postulación está en revisión.",
    active: "Tu perfil está publicado y visible en la plataforma.",
    rejected: `Tu postulación fue rechazada.${athlete.rejection_reason ? ` Motivo: ${athlete.rejection_reason}` : ""}`,
    suspended: "Tu perfil está suspendido temporalmente.",
  };

  const activeCampaign = athlete.campaigns.find((c) => c.status === "active" || c.status === "grace");
  const draftCampaigns = athlete.campaigns.filter((c) => c.status === "draft");

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

      <ProfileEditor athlete={athlete} accessToken={session.access_token} />

      <CampaignEditor
        accessToken={session.access_token}
        activeCampaign={activeCampaign}
        draftCampaigns={draftCampaigns}
      />
    </div>
  );
}
