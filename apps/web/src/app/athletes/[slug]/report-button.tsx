"use client";

import { useState } from "react";
import { REPORT_REASONS, reportAthlete } from "@/lib/api";

export function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return <p className="text-sm text-muted-foreground">Gracias, recibimos tu reporte y lo vamos a revisar.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground underline decoration-dotted hover:text-danger"
      >
        Reportar este perfil
      </button>
    );
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await reportAthlete(slug, { reason, detail: detail || undefined });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el reporte");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium text-foreground">Reportar este perfil</p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Contanos más (opcional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
      />
      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          onClick={submit}
          className="rounded-lg bg-danger px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar reporte"}
        </button>
        <button
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
