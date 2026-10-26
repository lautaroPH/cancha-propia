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
          className="input input-sm flex-1"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="btn btn-primary btn-sm"
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
              className="btn btn-secondary btn-sm"
            >
              {s.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
