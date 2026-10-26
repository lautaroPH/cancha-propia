"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { devIssueOtp } from "@/lib/api";

const STORAGE_KEY = "dev-quick-accounts";
const DEFAULT_ACCOUNTS = [
  "lautaroph@gmail.com",
  "atleta.prueba1@example.com",
  "atleta.prueba2@example.com",
  "menor.prueba@example.com",
  "admin.prueba@example.com",
];

function subscribeToAccounts(onChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getAccountsSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getAccountsServerSnapshot(): string {
  return "";
}

function persistAccounts(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // useSyncExternalStore only re-renders on the native "storage" event, which
  // browsers fire in *other* tabs, not this one — dispatch it ourselves.
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

// Local dev only — lets you switch between test accounts instantly, no email
// involved. Only renders in `next dev` (NODE_ENV is inlined at build time,
// so this whole component tree is stripped from a production build).
export function DevQuickSwitch({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const rawAccounts = useSyncExternalStore(subscribeToAccounts, getAccountsSnapshot, getAccountsServerSnapshot);
  const accounts = useMemo(() => {
    try {
      const parsed = JSON.parse(rawAccounts || "null");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    } catch {
      // fall through to defaults
    }
    return DEFAULT_ACCOUNTS;
  }, [rawAccounts]);

  const [newEmail, setNewEmail] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Generating a second OTP for the same email invalidates the first one, so a
  // fast double-click (before React's disabled-state re-render lands) can race
  // itself into "token expired." A ref-based lock closes that gap synchronously,
  // unlike state, which only updates on the next render.
  const inFlight = useRef(false);

  async function switchTo(email: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyEmail(email);
    setError("");
    try {
      const { token } = await devIssueOtp(email);
      const supabase = createClient();
      // "email" accepts both a magic-link OTP (existing user) and a signup OTP
      // (first login) — "magiclink" rejected the latter, so a brand-new test
      // account always failed on its first click.
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (verifyError) throw verifyError;

      if (!accounts.includes(email)) persistAccounts([email, ...accounts]);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar de cuenta");
    } finally {
      inFlight.current = false;
      setBusyEmail(null);
    }
  }

  function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || accounts.includes(newEmail)) return;
    persistAccounts([newEmail, ...accounts]);
    setNewEmail("");
  }

  return (
    <div className="mt-10 rounded-lg border border-dashed border-accent p-4">
      <p className="text-sm font-semibold text-accent">Dev: cambio rápido de cuenta</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Solo en desarrollo. Un click te loguea directo, sin email ni magic link.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {accounts.map((email) => (
          <button
            key={email}
            onClick={() => switchTo(email)}
            disabled={busyEmail !== null}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:border-accent disabled:opacity-50"
          >
            {busyEmail === email ? "Entrando..." : email}
          </button>
        ))}
      </div>

      <form onSubmit={addAccount} className="mt-3 flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="nuevo-email-de-prueba@example.com"
          className="input input-sm flex-1 text-xs"
        />
        <button
          type="submit"
          className="btn btn-secondary btn-sm"
        >
          Agregar
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
