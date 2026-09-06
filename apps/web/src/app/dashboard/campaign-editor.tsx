"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closeMyCampaign,
  createMyCampaign,
  updateMyCampaignRaised,
  type CampaignBreakdownItem,
  type Campaign,
} from "@/lib/api";

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function CampaignEditor({
  accessToken,
  activeCampaign,
  draftCampaigns,
  pausedCampaign,
}: {
  accessToken: string;
  activeCampaign?: Campaign;
  draftCampaigns: Campaign[];
  pausedCampaign?: Campaign;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Campaña</h2>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {activeCampaign ? (
        <div className="rounded-lg border border-accent-soft bg-accent-soft/40 p-4">
          <p className="font-medium text-foreground">{activeCampaign.title}</p>
          <p className="text-sm text-muted-foreground">Meta: {money(activeCampaign.goal_amount_ars)}</p>
          <RaisedForm
            campaignId={activeCampaign.id}
            current={activeCampaign.raised_amount_ars}
            accessToken={accessToken}
            busy={busy}
            run={run}
          />
          <button
            disabled={busy}
            onClick={() => run(() => closeMyCampaign(accessToken, activeCampaign.id))}
            className="mt-3 text-sm font-medium text-muted-foreground hover:text-danger disabled:opacity-50"
          >
            Cerrar campaña
          </button>
        </div>
      ) : pausedCampaign ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{pausedCampaign.title}</p>
          <p className="mt-1">Un administrador pausó esta campaña temporalmente. Contactanos si tenés dudas.</p>
        </div>
      ) : draftCampaigns.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Tenés {draftCampaigns.length} campaña(s) esperando aprobación del administrador:{" "}
          {draftCampaigns.map((c) => c.title).join(", ")}
        </div>
      ) : (
        <NewCampaignForm accessToken={accessToken} busy={busy} run={run} />
      )}
    </section>
  );
}

function RaisedForm({
  campaignId,
  current,
  accessToken,
  busy,
  run,
}: {
  campaignId: string;
  current: number | null;
  accessToken: string;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [raised, setRaised] = useState(String(current ?? ""));

  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-sm text-foreground/90">Recaudado hasta ahora (autoreportado):</label>
      <input
        type="number"
        value={raised}
        onChange={(e) => setRaised(e.target.value)}
        className="w-32 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
      <button
        disabled={busy}
        onClick={() => run(() => updateMyCampaignRaised(accessToken, campaignId, Number(raised) || 0))}
        className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        Actualizar
      </button>
    </div>
  );
}

function NewCampaignForm({
  accessToken,
  busy,
  run,
}: {
  accessToken: string;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [breakdown, setBreakdown] = useState<CampaignBreakdownItem[]>([{ label: "", amount_ars: 0 }]);

  const goal = breakdown.reduce((sum, b) => sum + (b.amount_ars || 0), 0);

  function updateItem(i: number, patch: Partial<CampaignBreakdownItem>) {
    setBreakdown((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">
        Creá una nueva campaña — queda pendiente hasta que un administrador la apruebe.
      </p>
      <input
        placeholder="Título (ej: Campeonato Panamericano 2027 — México)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />

      <div className="space-y-2">
        {breakdown.map((b, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="Concepto (ej: Viaje)"
              value={b.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <input
              type="number"
              placeholder="Monto"
              value={b.amount_ars || ""}
              onChange={(e) => updateItem(i, { amount_ars: Number(e.target.value) || 0 })}
              className="w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setBreakdown((prev) => [...prev, { label: "", amount_ars: 0 }])}
          className="text-sm font-medium text-accent hover:underline"
        >
          + Agregar concepto
        </button>
      </div>

      <p className="text-sm font-medium text-foreground">Meta total: {money(goal)}</p>

      <button
        disabled={busy || !title || goal <= 0}
        onClick={() =>
          run(() =>
            createMyCampaign(accessToken, {
              title,
              description: description || undefined,
              event_date: eventDate || undefined,
              goal_amount_ars: goal,
              breakdown: breakdown.filter((b) => b.label && b.amount_ars > 0),
            })
          )
        }
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        Crear campaña
      </button>
    </div>
  );
}
