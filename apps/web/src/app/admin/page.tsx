import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListApplications, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {status}
    </span>
  );
}

export default async function AdminQueuePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login?next=/admin");

  let applications;
  try {
    applications = await adminListApplications(session.access_token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Postulaciones pendientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <Link href="/admin/athletes" className="text-sm font-medium text-accent hover:underline">
          Ver todos los atletas →
        </Link>
      </div>

      {applications.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No hay postulaciones pendientes.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {applications.map((a) => (
            <Link
              key={a.id}
              href={`/admin/athletes/${a.id}`}
              className="flex items-center justify-between gap-4 p-4 transition hover:bg-surface-muted"
            >
              <div>
                <p className="font-medium text-foreground">{a.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.sport}
                  {a.province ? ` · ${a.province}` : ""} · postuló el{" "}
                  {new Date(a.created_at).toLocaleDateString("es-AR")}
                </p>
              </div>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
