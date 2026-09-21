"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateSport, adminUpdateSport, type SportOption } from "@/lib/api";

export function SportManager({ sports, accessToken }: { sports: SportOption[]; accessToken: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addSport(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await adminCreateSport(accessToken, name.trim());
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el deporte");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(sport: SportOption) {
    setBusy(true);
    setError("");
    try {
      await adminUpdateSport(accessToken, sport.id, !sport.active);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el deporte");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={addSport} className="flex gap-2">
        <input
          placeholder="Nuevo deporte (ej: Ajedrez)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
        {sports.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 p-3">
            <span className={`text-sm ${s.active ? "text-foreground" : "text-muted-foreground line-through"}`}>
              {s.name}
            </span>
            <button
              disabled={busy}
              onClick={() => toggle(s)}
              className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
            >
              {s.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
