import Link from "next/link";
import { StatusPill, statusLabel } from "@/components/status-pill";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListAthletes, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";

const STATUSES = ["invited", "pending", "active", "rejected", "suspended"] as const;

export default async function AdminAllAthletesPage(props: PageProps<"/admin/athletes">) {
  const { status } = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/admin/athletes");

  const statusFilter = typeof status === "string" ? status : undefined;

  let athletes;
  try {
    athletes = await adminListAthletes(session.access_token, statusFilter);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin/athletes");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-[2.5rem] sm:text-[3rem]">Todos los atletas</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/athletes"
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            !statusFilter ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground"
          }`}
        >
          Todos
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/athletes?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              statusFilter === s ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground"
            }`}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
        {athletes.length === 0 && (
          <p className="p-8 text-center text-muted-foreground">No hay atletas en este estado.</p>
        )}
        {athletes.map((a) => (
          <Link
            key={a.id}
            href={`/admin/athletes/${a.id}`}
            className="flex items-center justify-between gap-4 p-4 transition hover:bg-surface-muted"
          >
            <div>
              <p className="font-medium text-foreground">{a.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {a.sport}
                {a.province ? ` · ${a.province}` : ""}
              </p>
            </div>
            <StatusPill status={a.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
