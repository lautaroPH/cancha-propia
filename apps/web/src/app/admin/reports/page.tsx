import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListReports, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";
import { ResolveReportButton } from "./resolve-report-button";

export default async function AdminReportsPage(props: PageProps<"/admin/reports">) {
  const { status } = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/admin/reports");

  const statusFilter = status === "resolved" ? "resolved" : "open";

  let reports;
  try {
    reports = await adminListReports(session.access_token, statusFilter);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin/reports");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        <Link
          href="/admin/reports"
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            statusFilter === "open" ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground"
          }`}
        >
          Abiertos
        </Link>
        <Link
          href="/admin/reports?status=resolved"
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            statusFilter === "resolved" ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground"
          }`}
        >
          Resueltos
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No hay reportes {statusFilter === "open" ? "abiertos" : "resueltos"}.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/athletes/${r.athlete_slug}`} className="font-medium text-foreground hover:underline">
                  {r.athlete_full_name}
                </Link>
                <p className="mt-0.5 text-sm text-foreground">{r.reason}</p>
                {r.detail && <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("es-AR")}
                </p>
                {r.status === "resolved" && r.resolved_note && (
                  <p className="mt-2 rounded-lg bg-verified-soft px-3 py-2 text-xs text-verified">
                    Resuelto: {r.resolved_note}
                  </p>
                )}
              </div>
              {r.status === "open" && (
                <div className="w-full shrink-0 sm:w-64">
                  <ResolveReportButton reportId={r.id} accessToken={session.access_token} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
