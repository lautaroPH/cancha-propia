"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMe, uploadProfilePhoto, type AthleteDetail, type Achievement } from "@/lib/api";

export function ProfileEditor({ athlete, accessToken }: { athlete: AthleteDetail; accessToken: string }) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(athlete.photo_url);
  const [photoS3Key, setPhotoS3Key] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [photoError, setPhotoError] = useState("");
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
  const [raffleUrl, setRaffleUrl] = useState(athlete.raffle_url ?? "");
  const [raffleDescription, setRaffleDescription] = useState(athlete.raffle_description ?? "");
  const [rafflePublic, setRafflePublic] = useState(athlete.raffle_public);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function save() {
    setStatus("saving");
    setError("");

    // A "público" toggle with nothing behind it just shows blank on the
    // profile — the API rejects this too, but catch it here for a clearer message.
    if (instagramPublic && !instagramHandle.trim()) {
      setStatus("error");
      setError("Completá tu usuario de Instagram antes de hacerlo público.");
      return;
    }
    if (whatsappPublic && !whatsappNumber.trim()) {
      setStatus("error");
      setError("Completá tu número de WhatsApp antes de hacerlo público.");
      return;
    }
    if (aliasPublic && !alias.trim()) {
      setStatus("error");
      setError("Completá tu alias antes de mostrarlo en tu perfil público.");
      return;
    }
    if (rafflePublic && !raffleUrl.trim()) {
      setStatus("error");
      setError("Completá el link de tu sorteo antes de mostrarlo en tu perfil público.");
      return;
    }

    // Blank rows (added but never filled in) get dropped rather than saved —
    // a title is the minimum for a logro to mean anything on the profile.
    const cleanAchievements = achievements
      .filter((a) => a.title.trim())
      .map((a) => ({ ...a, title: a.title.trim() }));

    try {
      await updateMe(accessToken, {
        ...(photoS3Key ? { photo_s3_key: photoS3Key } : {}),
        bio,
        story,
        achievements: cleanAchievements,
        instagram_handle: instagramHandle || undefined,
        instagram_public: instagramPublic,
        whatsapp_number: whatsappNumber || undefined,
        whatsapp_public: whatsappPublic,
        alias: alias || undefined,
        cbu: cbu || undefined,
        alias_public: aliasPublic,
        raffle_url: raffleUrl || undefined,
        raffle_description: raffleDescription || undefined,
        raffle_public: rafflePublic,
      });
      setAchievements(cleanAchievements);
      setPhotoS3Key(null);
      setStatus("saved");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoStatus("uploading");
    setPhotoError("");
    try {
      const s3Key = await uploadProfilePhoto(accessToken, file);
      setPhotoS3Key(s3Key);
      setPhotoUrl(URL.createObjectURL(file));
      setPhotoStatus("idle");
    } catch (err) {
      setPhotoStatus("error");
      setPhotoError(err instanceof Error ? err.message : "No se pudo subir la foto");
    }
  }

  function updateAchievement(i: number, patch: Partial<Achievement>) {
    setAchievements((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  return (
    <section className="mt-8 space-y-5 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Tu perfil</h2>

      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <label className="block">
          <span className="text-sm font-medium text-foreground/90">Foto de perfil</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="mt-1 block text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">Esta se muestra públicamente en tu perfil.</p>
          {photoStatus === "uploading" && <p className="mt-1 text-xs text-accent">Subiendo...</p>}
          {photoStatus === "error" && <p className="mt-1 text-xs text-danger">{photoError}</p>}
          {photoS3Key && photoStatus === "idle" && (
            <p className="mt-1 text-xs text-verified">✓ Lista — guardá los cambios para publicarla</p>
          )}
        </label>
      </div>

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
        <div className="mt-2 space-y-3">
          {achievements.map((a, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
              <div className="flex gap-2">
                <input
                  placeholder="Título (obligatorio)"
                  value={a.title}
                  onChange={(e) => updateAchievement(i, { title: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
                <input
                  type="date"
                  value={a.date ?? ""}
                  onChange={(e) => updateAchievement(i, { date: e.target.value || undefined })}
                  className="w-40 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAchievements((prev) => prev.filter((_, idx) => idx !== i))}
                  className="px-2 text-sm text-muted-foreground hover:text-danger"
                >
                  Quitar
                </button>
              </div>
              <input
                placeholder="Descripción (opcional)"
                value={a.description ?? ""}
                onChange={(e) => updateAchievement(i, { description: e.target.value || undefined })}
                className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAchievements((prev) => [...prev, { title: "" }])}
            className="text-sm font-medium text-accent hover:underline"
          >
            + Agregar logro
          </button>
          <p className="text-xs text-muted-foreground">
            Los logros sin título no se guardan.
          </p>
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

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Sorteo o rifa</p>
        <input
          placeholder="Link a tu sorteo (Instagram, sitio externo, etc.)"
          value={raffleUrl}
          onChange={(e) => setRaffleUrl(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <input
          placeholder="Breve descripción (opcional)"
          value={raffleDescription}
          onChange={(e) => setRaffleDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <label className="flex items-center gap-1.5 text-sm text-foreground/90">
          <input type="checkbox" checked={rafflePublic} onChange={(e) => setRafflePublic(e.target.checked)} />
          Mostrar en mi perfil público
        </label>
        <p className="text-xs text-muted-foreground">
          El sorteo lo organizás y gestionás vos, fuera de la plataforma — nosotros solo mostramos el
          link.
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
