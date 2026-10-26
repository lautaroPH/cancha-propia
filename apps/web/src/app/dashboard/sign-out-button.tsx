"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The header hides "Salir" on phones to keep the celeste band to one line —
// the dashboard is where a phone user signs out.
export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="font-semibold opacity-75 hover:underline hover:opacity-100">
      Cerrar sesión
    </button>
  );
}
