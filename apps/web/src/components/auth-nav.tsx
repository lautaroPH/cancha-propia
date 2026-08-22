"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (email === undefined) return <div className="h-8 w-16" />;

  if (email === null) {
    return (
      <Link href="/login" className="text-sm font-medium text-foreground hover:text-accent">
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/dashboard" className="font-medium text-foreground hover:text-accent">
        Mi cuenta
      </Link>
      <Link href="/admin" className="font-medium text-foreground hover:text-accent">
        Admin
      </Link>
      <button onClick={signOut} className="text-muted-foreground hover:text-danger">
        Salir
      </button>
    </div>
  );
}
