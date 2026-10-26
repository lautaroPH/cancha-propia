import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListApplications, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";
import { StatusPill } from "@/components/admin-nav";

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div>
          <h1 className="text-[2.5rem] sm:text-[3rem]">Postulaciones pendientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        </div>
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
