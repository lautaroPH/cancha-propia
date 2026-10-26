"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApproveCampaign, adminPauseCampaign, adminResumeCampaign, type Campaign } from "@/lib/api";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function CampaignApprovals({ campaigns, accessToken }: { campaigns: Campaign[]; accessToken: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pauseReason, setPauseReason] = useState<Record<string, string>>({});

  async function run(id: string, action: () => Promise<unknown>, failMessage: string) {
    setBusyId(id);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : failMessage);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="mt-2 space-y-2">
      {campaigns.map((c) => (
        <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{c.title}</span>
            <span className="text-xs text-muted-foreground">{c.status}</span>
          </div>
          <p className="text-muted-foreground">Meta: {money(c.goal_amount_ars)}</p>
          {c.status === "draft" && (
            <button
              disabled={busyId === c.id}
              onClick={() => run(c.id, () => adminApproveCampaign(accessToken, c.id), "No se pudo aprobar la campaña")}
              className="mt-2 btn btn-verified btn-sm"
            >
              {busyId === c.id ? "Aprobando..." : "Aprobar campaña"}
            </button>
          )}
          {(c.status === "active" || c.status === "grace") && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                placeholder="Motivo de la pausa (opcional)"
                value={pauseReason[c.id] ?? ""}
                onChange={(e) => setPauseReason((prev) => ({ ...prev, [c.id]: e.target.value }))}
                className="input input-sm min-w-0 flex-1"
              />
              <button
                disabled={busyId === c.id}
                onClick={() =>
                  run(
                    c.id,
                    () => adminPauseCampaign(accessToken, c.id, pauseReason[c.id]),
                    "No se pudo pausar la campaña"
                  )
                }
                className="btn btn-secondary btn-sm"
              >
                {busyId === c.id ? "Pausando..." : "Pausar campaña"}
              </button>
            </div>
          )}
          {c.status === "paused" && (
            <button
              disabled={busyId === c.id}
              onClick={() => run(c.id, () => adminResumeCampaign(accessToken, c.id), "No se pudo reanudar la campaña")}
              className="mt-2 btn btn-primary btn-sm"
            >
              {busyId === c.id ? "Reanudando..." : "Reanudar campaña"}
            </button>
          )}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </li>
      ))}
    </ul>
  );
}
