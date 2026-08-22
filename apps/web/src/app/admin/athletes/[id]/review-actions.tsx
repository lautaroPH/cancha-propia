"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApprove, adminReactivate, adminReject, adminRequestInfo, adminSuspend } from "@/lib/api";

export function ReviewActions({
  athleteId,
  accessToken,
  status,
}: {
  athleteId: string;
  accessToken: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [identityVerified, setIdentityVerified] = useState(false);
  const [careerVerified, setCareerVerified] = useState(false);
  const [competitionVerified, setCompetitionVerified] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");

  const [rejectReason, setRejectReason] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 space-y-6 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Acciones</h2>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {status === "pending" && (
        <>
          <div className="rounded-lg border border-verified-soft bg-verified-soft/40 p-4">
            <p className="text-sm font-medium text-foreground">Aprobar</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={identityVerified} onChange={(e) => setIdentityVerified(e.target.checked)} />
                Identidad
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={careerVerified} onChange={(e) => setCareerVerified(e.target.checked)} />
                Trayectoria
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={competitionVerified}
                  onChange={(e) => setCompetitionVerified(e.target.checked)}
                />
                Competencia
              </label>
            </div>
            <textarea
              placeholder="Notas internas (opcional)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <button
              disabled={busy}
              onClick={() =>
                run(() =>
                  adminApprove(accessToken, athleteId, {
                    identity_verified: identityVerified,
                    career_verified: careerVerified,
                    competition_verified: competitionVerified,
                    notes: approveNotes || undefined,
                  })
                )
              }
              className="mt-3 rounded-lg bg-verified px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Aprobar y publicar
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Rechazar</p>
            <textarea
              placeholder="Motivo del rechazo"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <button
              disabled={busy || !rejectReason}
              onClick={() => run(() => adminReject(accessToken, athleteId, rejectReason))}
              className="mt-2 rounded-lg border border-danger px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Pedir más información</p>
            <textarea
              placeholder="Qué necesitás que agregue"
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <button
              disabled={busy || !infoMessage}
              onClick={() => run(() => adminRequestInfo(accessToken, athleteId, infoMessage))}
              className="mt-2 rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
            >
              Enviar pedido
            </button>
          </div>
        </>
      )}

      {status === "active" && (
        <div>
          <p className="text-sm font-medium text-foreground">Suspender</p>
          <textarea
            placeholder="Motivo de la suspensión"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          <button
            disabled={busy || !suspendReason}
            onClick={() => run(() => adminSuspend(accessToken, athleteId, suspendReason))}
            className="mt-2 rounded-lg border border-danger px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            Suspender
          </button>
        </div>
      )}

      {status === "suspended" && (
        <button
          disabled={busy}
          onClick={() => run(() => adminReactivate(accessToken, athleteId))}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          Reactivar
        </button>
      )}
    </section>
  );
}
