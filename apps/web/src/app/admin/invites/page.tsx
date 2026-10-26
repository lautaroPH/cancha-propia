import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminListAthletes, ApiError } from "@/lib/api";
import { AdminAccessDenied } from "@/components/admin-access-denied";
import { InviteManager } from "./invite-manager";

export default async function AdminInvitesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/admin/invites");

  let invites;
  try {
    invites = await adminListAthletes(session.access_token, "invited");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login?next=/admin/invites");
    if (err instanceof ApiError && err.status === 403) return <AdminAccessDenied email={session.user.email!} />;
    throw err;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-[2.5rem] sm:text-[3rem]">Invitaciones</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Armá un borrador privado con lo que ves en el Instagram de un atleta y mandale el link. Solo lo ve quien
        tenga el link: no aparece en el álbum hasta que el atleta lo reclama con su email y lo aprobás.
      </p>
      <InviteManager accessToken={session.access_token} invites={invites} />
    </div>
  );
}
