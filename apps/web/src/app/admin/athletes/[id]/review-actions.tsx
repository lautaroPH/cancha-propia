"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApprove, adminReactivate, adminReject, adminRequestInfo, adminSuspend } from "@/lib/api";

type Decision = "approve" | "info" | "reject";

const DECISIONS: { id: Decision; label: string }[] = [
  { id: "approve", label: "Aprobar" },
  { id: "info", label: "Pedir info" },
  { id: "reject", label: "Rechazar" },
];

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
  // One decision at a time — three stacked forms made it easy to type a
  // rejection reason and hit the wrong button.
  const [decision, setDecision] = useState<Decision>("approve");

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
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="group-title">Decisión</h2>
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {status === "pending" && (
        <>
          <div role="tablist" aria-label="Decisión" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
            {DECISIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={decision === d.id}
                onClick={() => setDecision(d.id)}
                className={`rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
                  decision === d.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {decision === "approve" && (
            <div className="mt-5 space-y-4">
              <fieldset>
                <legend className="field-label">Sellos que confirmaste</legend>
                <div className="mt-2 space-y-2.5 text-sm">
                  <Seal
                    label="Identidad"
                    hint="Su Instagram o sus links muestran que es quien dice ser."
                    checked={identityVerified}
                    onChange={setIdentityVerified}
                  />
                  <Seal
                    label="Trayectoria"
                    hint="Confirmaste su club, federación o disciplina."
                    checked={careerVerified}
                    onChange={setCareerVerified}
                  />
                  <Seal
                    label="Competencia"
                    hint="Compite o fue convocado/a a lo que menciona."
                    checked={competitionVerified}
                    onChange={setCompetitionVerified}
                  />
                </div>
              </fieldset>
              <textarea
                aria-label="Notas internas"
                placeholder="Notas internas (opcional, el atleta no las ve)"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                rows={2}
                className="input input-sm"
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
                className="btn btn-verified w-full"
              >
                {busy ? "Publicando..." : "Aprobar y publicar"}
              </button>
            </div>
          )}

          {decision === "info" && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                El atleta lo ve en su panel y en la postulación. Sigue en revisión.
              </p>
              <textarea
                aria-label="Qué necesitás"
                placeholder="Ej: Pasanos el link de tu ranking en la federación."
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                rows={4}
                className="input input-sm"
              />
              <button
                disabled={busy || !infoMessage.trim()}
                onClick={() => run(() => adminRequestInfo(accessToken, athleteId, infoMessage))}
                className="btn btn-primary w-full"
              >
                Enviar pedido
              </button>
            </div>
          )}

          {decision === "reject" && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                El atleta recibe el motivo por email y puede volver a postularse después de la espera.
              </p>
              <textarea
                aria-label="Motivo del rechazo"
                placeholder="Motivo del rechazo"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="input input-sm"
              />
              <button
                disabled={busy || !rejectReason.trim()}
                onClick={() => run(() => adminReject(accessToken, athleteId, rejectReason))}
                className="btn btn-danger w-full"
              >
                Rechazar postulación
              </button>
            </div>
          )}
        </>
      )}

      {status === "active" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Publicado. Si algo no está bien, podés suspenderlo.</p>
          <textarea
            aria-label="Motivo de la suspensión"
            placeholder="Motivo de la suspensión"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            className="input input-sm"
          />
          <button
            disabled={busy || !suspendReason.trim()}
            onClick={() => run(() => adminSuspend(accessToken, athleteId, suspendReason))}
            className="btn btn-danger w-full"
          >
            Suspender
          </button>
        </div>
      )}

      {status === "suspended" && (
        <button
          disabled={busy}
          onClick={() => run(() => adminReactivate(accessToken, athleteId))}
          className="btn btn-primary mt-4 w-full"
        >
          Reactivar
        </button>
      )}

      {status === "rejected" && (
        <p className="mt-4 text-sm text-muted-foreground">Rechazado. Puede volver a postularse después de la espera.</p>
      )}
    </section>
  );
}

function Seal({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--verified)]"
      />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
