"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApproveCampaign, type Campaign } from "@/lib/api";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function CampaignApprovals({ campaigns, accessToken }: { campaigns: Campaign[]; accessToken: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function approve(id: string) {
    setBusyId(id);
    setError("");
    try {
      await adminApproveCampaign(accessToken, id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar la campaña");
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
            <>
              <button
                disabled={busyId === c.id}
                onClick={() => approve(c.id)}
                className="mt-2 rounded-lg bg-verified px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busyId === c.id ? "Aprobando..." : "Aprobar campaña"}
              </button>
              {error && <p className="mt-1 text-xs text-danger">{error}</p>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
