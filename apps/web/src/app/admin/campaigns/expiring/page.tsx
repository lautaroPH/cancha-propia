import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListExpiringCampaigns, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  return days <= 0 ? "hoy" : `hace ${days} día${days === 1 ? "" : "s"}`;
}

export default async function AdminExpiringCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/admin/campaigns/expiring");

  let campaigns;
  try {
    campaigns = await adminListExpiringCampaigns(session.access_token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin/campaigns/expiring");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Campañas vencidas</h1>
        <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
          ← Volver
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Campañas cuya fecha de competencia ya pasó. En <strong>gracia</strong>, el atleta todavía puede cerrarla o
        actualizar la fecha sin pasar por revisión. Si nadie actúa en 7 días pasa a <strong>vencida</strong> y sale
        del perfil público — desde acá podés recordarle al atleta o suspender el perfil si hace falta.
      </p>

      {campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No hay campañas vencidas.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/athletes/${c.athlete_id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-surface-muted"
            >
              <div>
                <p className="font-medium text-foreground">{c.athlete_full_name}</p>
                <p className="text-sm text-muted-foreground">{c.title}</p>
                {c.event_date && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Vencida el {new Date(c.event_date).toLocaleDateString("es-AR")} ({daysSince(c.event_date)})
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  c.status === "expired"
                    ? "bg-danger-soft text-danger"
                    : "bg-accent-soft text-accent-strong"
                }`}
              >
                {c.status === "expired" ? "Vencida" : "En gracia"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
