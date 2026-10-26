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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[2.5rem] sm:text-[3rem]">Deportes</h1>
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
