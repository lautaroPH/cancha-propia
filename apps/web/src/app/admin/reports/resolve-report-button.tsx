"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminResolveReport } from "@/lib/api";

export function ResolveReportButton({ reportId, accessToken }: { reportId: string; accessToken: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
      >
        Resolver
      </button>
    );
  }

  async function resolve() {
    setBusy(true);
    setError("");
    try {
      await adminResolveReport(accessToken, reportId, note);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver el reporte");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 w-full">
      {error && <p className="mb-1 text-xs text-danger">{error}</p>}
      <textarea
        placeholder="Nota de resolución (qué se revisó / qué se hizo)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
      />
      <div className="mt-1.5 flex gap-2">
        <button
          disabled={busy || !note}
          onClick={resolve}
          className="rounded-lg bg-verified px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Marcar resuelto"}
        </button>
        <button
          disabled={busy}
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
