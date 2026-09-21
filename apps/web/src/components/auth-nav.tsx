"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMe, adminWhoAmI, ApiError } from "@/lib/api";

type Session = { email: string; token: string } | null;

export function AuthNav() {
  const router = useRouter();
  const [session, setSession] = useState<Session | undefined>(undefined);
  // undefined = still checking, null = no profile / not an admin
  const [displayName, setDisplayName] = useState<string | null | undefined>(undefined);
  const [hasApplication, setHasApplication] = useState<boolean | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  // Tracks which account the three fields above were fetched for, so switching
  // straight from one logged-in account to another (no sign-out in between —
  // e.g. the dev quick-switch) doesn't flash the previous account's values
  // while the new fetch is in flight. Resetting here, during render, is the
  // React-documented way to do this — not from inside the fetch effect below.
  const [fetchedForToken, setFetchedForToken] = useState<string | undefined>(undefined);
  if (session && session.token !== fetchedForToken) {
    setFetchedForToken(session.token);
    setDisplayName(undefined);
    setHasApplication(undefined);
    setIsAdmin(undefined);
  }

  useEffect(() => {
    const supabase = createClient();

    function onSession(s: { access_token: string; user: { email?: string | null } } | null) {
      setSession(s ? { email: s.user.email ?? "", token: s.access_token } : null);
    }

    supabase.auth.getSession().then(({ data }) => onSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => onSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    getMe(session.token)
      .then((athlete) => {
        setHasApplication(true);
        setDisplayName(athlete.full_name.split(" ")[0]);
      })
      .catch((err) => {
        // 403 = no athlete profile linked to this account yet.
        setHasApplication(err instanceof ApiError && err.status === 403 ? false : true);
        setDisplayName(session.email.split("@")[0]);
      });

    adminWhoAmI(session.token)
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [session]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (session === undefined) return <div className="h-8 w-16" />;

  if (session === null) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/apply"
          className="rounded-lg bg-accent px-3.5 py-1.5 font-medium text-accent-foreground hover:opacity-90"
        >
          Postularme
        </Link>
        <Link href="/login" className="font-medium text-foreground hover:text-accent">
          Ingresar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {hasApplication === false && (
        <Link
          href="/apply"
          className="rounded-lg bg-accent px-3.5 py-1.5 font-medium text-accent-foreground hover:opacity-90"
        >
          Postularme
        </Link>
      )}
      <Link href="/dashboard" className="font-medium text-foreground hover:text-accent">
        {displayName ?? "Mi cuenta"}
      </Link>
      {isAdmin && (
        <Link href="/admin" className="font-medium text-foreground hover:text-accent">
          Admin
        </Link>
      )}
      <button onClick={signOut} className="text-muted-foreground hover:text-danger">
        Salir
      </button>
    </div>
  );
}
