import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListSports, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";
import { SportManager } from "./sport-manager";

export default async function AdminSportsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/admin/sports");

  let sports;
  try {
    sports = await adminListSports(session.access_token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin/sports");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Deportes</h1>
        <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
          ← Volver
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Lista de sugerencias para el campo &ldquo;Deporte&rdquo; en la postulación — el campo sigue
        siendo de texto libre, esto solo controla qué aparece como sugerencia. Desactivar no borra el
        deporte de atletas que ya lo tengan cargado.
      </p>
      <SportManager sports={sports} accessToken={session.access_token} />
    </div>
  );
}
