"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closeMyCampaign,
  createMyCampaign,
  renewMyCampaign,
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
  expiredCampaign,
  draftCampaigns,
  pausedCampaign,
}: {
  accessToken: string;
  activeCampaign?: Campaign;
  expiredCampaign?: Campaign;
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
    <section className="space-y-5">
      <div>
        <h2 className="group-title">Campaña</h2>
        <p className="field-hint">Una meta concreta para tu próxima competencia: viaje, inscripción, equipo. Se publica cuando nuestro equipo la aprueba.</p>
      </div>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {activeCampaign ? (
        <div className="rounded-xl bg-sol-soft p-5">
          <p className="display text-[1.5rem]">{activeCampaign.title}</p>
          <p className="text-sm text-muted-foreground">Meta: {money(activeCampaign.goal_amount_ars)}</p>

          {activeCampaign.status === "grace" && (
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-sm text-foreground">
                La fecha de tu competencia ya pasó. Cerrá la campaña o actualizá la fecha para seguir mostrándola.
              </p>
              <RenewForm campaignId={activeCampaign.id} accessToken={accessToken} busy={busy} run={run} />
            </div>
          )}

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
          <p className="mt-1">Nuestro equipo pausó esta campaña por ahora. Escribinos si tenés dudas.</p>
        </div>
      ) : expiredCampaign ? (
        <div className="rounded-xl bg-danger-soft p-5">
          <p className="font-medium text-foreground">{expiredCampaign.title}</p>
          <p className="mt-1 text-sm text-foreground">
            Esta campaña venció y ya no se muestra en tu perfil público. Actualizá la fecha si la competencia se
            reprogramó, o cerrala si ya no aplica.
          </p>
          <RenewForm campaignId={expiredCampaign.id} accessToken={accessToken} busy={busy} run={run} />
          <button
            disabled={busy}
            onClick={() => run(() => closeMyCampaign(accessToken, expiredCampaign.id))}
            className="mt-3 text-sm font-medium text-muted-foreground hover:text-danger disabled:opacity-50"
          >
            Cerrar campaña
          </button>
        </div>
      ) : draftCampaigns.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {draftCampaigns.length === 1 ? "Tu campaña está esperando aprobación:" : `Tenés ${draftCampaigns.length} campañas esperando aprobación:`}{" "}
          {draftCampaigns.map((c) => c.title).join(", ")}
        </div>
      ) : (
        <NewCampaignForm accessToken={accessToken} busy={busy} run={run} />
      )}
    </section>
  );
}

function RenewForm({
  campaignId,
  accessToken,
  busy,
  run,
}: {
  campaignId: string;
  accessToken: string;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [eventDate, setEventDate] = useState("");

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
        className="input input-sm w-auto"
      />
      <button
        disabled={busy || !eventDate}
        onClick={() => run(() => renewMyCampaign(accessToken, campaignId, eventDate))}
        className="btn btn-primary btn-sm"
      >
        Actualizar fecha
      </button>
    </div>
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
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label className="w-full text-sm font-semibold sm:w-auto">Recaudado hasta ahora (lo informás vos):</label>
      <input
        type="number"
        value={raised}
        onChange={(e) => setRaised(e.target.value)}
        className="input input-sm w-32"
      />
      <button
        disabled={busy}
        onClick={() => run(() => updateMyCampaignRaised(accessToken, campaignId, Number(raised) || 0))}
        className="btn btn-primary btn-sm"
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
    <div className="space-y-3 rounded-xl border border-border p-5">
      <input
        placeholder="Título (ej: Panamericano 2027 en México)"
        aria-label="Título de la campaña"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input input-sm w-full"
      />
      <textarea
        placeholder="Contá para qué es y por qué importa"
        aria-label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="input input-sm w-full"
      />
      <label className="block">
        <span className="field-label">Fecha de la competencia</span>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="input input-sm mt-1.5 w-auto"
        />
      </label>

      <div className="space-y-2">
        <p className="field-label">En qué se usa la plata</p>
        {breakdown.map((b, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="Concepto (ej: Viaje)"
              value={b.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
              className="input input-sm flex-1"
            />
            <input
              type="number"
              placeholder="Monto"
              value={b.amount_ars || ""}
              onChange={(e) => updateItem(i, { amount_ars: Number(e.target.value) || 0 })}
              className="input input-sm w-32"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setBreakdown((prev) => [...prev, { label: "", amount_ars: 0 }])}
          className="text-sm font-semibold text-accent underline hover:no-underline"
        >
          + Agregar concepto
        </button>
      </div>

      <p className="text-sm">Meta total: <span className="display text-[1.5rem]">{money(goal)}</span></p>

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
        className="btn btn-primary"
      >
        Crear campaña
      </button>
    </div>
  );
}
