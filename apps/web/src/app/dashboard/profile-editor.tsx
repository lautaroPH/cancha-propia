"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMe, type AthleteDetail } from "@/lib/api";

type Achievement = { title: string; year?: number; description?: string };

export function ProfileEditor({ athlete, accessToken }: { athlete: AthleteDetail; accessToken: string }) {
  const router = useRouter();
  const [bio, setBio] = useState(athlete.bio ?? "");
  const [story, setStory] = useState(athlete.story ?? "");
  const [achievements, setAchievements] = useState<Achievement[]>(athlete.achievements as Achievement[]);
  const [instagramHandle, setInstagramHandle] = useState(athlete.instagram_handle ?? "");
  const [instagramPublic, setInstagramPublic] = useState(athlete.instagram_public);
  const [whatsappNumber, setWhatsappNumber] = useState(athlete.whatsapp_number ?? "");
  const [whatsappPublic, setWhatsappPublic] = useState(athlete.whatsapp_public);
  const [alias, setAlias] = useState(athlete.alias ?? "");
  const [cbu, setCbu] = useState(athlete.cbu ?? "");
  const [aliasPublic, setAliasPublic] = useState(athlete.alias_public);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function save() {
    setStatus("saving");
    setError("");
    try {
      await updateMe(accessToken, {
        bio,
        story,
        achievements,
        instagram_handle: instagramHandle || undefined,
        instagram_public: instagramPublic,
        whatsapp_number: whatsappNumber || undefined,
        whatsapp_public: whatsappPublic,
        alias: alias || undefined,
        cbu: cbu || undefined,
        alias_public: aliasPublic,
      });
      setStatus("saved");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  function updateAchievement(i: number, patch: Partial<Achievement>) {
    setAchievements((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  return (
    <section className="mt-8 space-y-5 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Tu perfil</h2>

      <label className="block">
        <span className="text-sm font-medium text-foreground/90">Biografía breve</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-foreground/90">Tu historia</span>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-foreground/90">Logros</span>
        <div className="mt-2 space-y-2">
          {achievements.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Año"
                value={a.year ?? ""}
                onChange={(e) => updateAchievement(i, { year: Number(e.target.value) || undefined })}
                className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
              <input
                placeholder="Título"
                value={a.title}
                onChange={(e) => updateAchievement(i, { title: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAchievements((prev) => prev.filter((_, idx) => idx !== i))}
                className="px-2 text-sm text-muted-foreground hover:text-danger"
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAchievements((prev) => [...prev, { title: "" }])}
            className="text-sm font-medium text-accent hover:underline"
          >
            + Agregar logro
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Instagram</p>
        <div className="flex gap-2">
          <input
            placeholder="usuario (sin @)"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-sm text-foreground/90">
            <input type="checkbox" checked={instagramPublic} onChange={(e) => setInstagramPublic(e.target.checked)} />
            Público
          </label>
        </div>

        <p className="text-sm font-medium text-foreground">WhatsApp</p>
        <div className="flex gap-2">
          <input
            placeholder="+54 9 11..."
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-sm text-foreground/90">
            <input type="checkbox" checked={whatsappPublic} onChange={(e) => setWhatsappPublic(e.target.checked)} />
            Público
          </label>
        </div>

        <p className="text-sm font-medium text-foreground">Alias / CBU para transferencias</p>
        <input
          placeholder="alias.mercadopago"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <input
          placeholder="CBU (opcional)"
          value={cbu}
          onChange={(e) => setCbu(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <label className="flex items-center gap-1.5 text-sm text-foreground/90">
          <input type="checkbox" checked={aliasPublic} onChange={(e) => setAliasPublic(e.target.checked)} />
          Mostrar en mi perfil público
        </label>
        <p className="text-xs text-muted-foreground">
          La plataforma nunca procesa ni retiene este dinero — solo lo muestra para que te transfieran
          directo.
        </p>
      </div>

      {status === "error" && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={save}
        disabled={status === "saving"}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </section>
  );
}
