"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSports, updateMe, uploadProfilePhoto, type AthleteDetail, type Achievement } from "@/lib/api";
import { PROVINCES, SPORTS } from "@/lib/constants";
import { InstagramIcon } from "@/components/instagram-embed";

const MAX_INSTAGRAM_POSTS = 6;
// Mirrors the backend's accepted shapes (schemas.normalize_instagram_post) so
// a bad paste is caught before Save, not after.
const INSTAGRAM_POST_RE = /^https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/[A-Za-z0-9_-]+/;

export function ProfileEditor({ athlete, accessToken }: { athlete: AthleteDetail; accessToken: string }) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(athlete.photo_url);
  const [photoS3Key, setPhotoS3Key] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [photoError, setPhotoError] = useState("");

  const [sport, setSport] = useState(athlete.sport);
  const [discipline, setDiscipline] = useState(athlete.discipline ?? "");
  const [category, setCategory] = useState(athlete.category ?? "");
  const [province, setProvince] = useState(athlete.province ?? "");
  const [city, setCity] = useState(athlete.city ?? "");
  const [club, setClub] = useState(athlete.club ?? "");
  const [federation, setFederation] = useState(athlete.federation ?? "");

  const [bio, setBio] = useState(athlete.bio ?? "");
  const [story, setStory] = useState(athlete.story ?? "");
  const [achievements, setAchievements] = useState<Achievement[]>(athlete.achievements as Achievement[]);

  const [instagramHandle, setInstagramHandle] = useState(athlete.instagram_handle ?? "");
  const [instagramPublic, setInstagramPublic] = useState(athlete.instagram_public);
  const [instagramPosts, setInstagramPosts] = useState<string[]>(athlete.instagram_posts ?? []);
  const [newPost, setNewPost] = useState("");
  const [newPostError, setNewPostError] = useState("");

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

  const [sports, setSports] = useState<string[]>(SPORTS);
  useEffect(() => {
    getSports()
      .then((list) => list.length > 0 && setSports(list))
      .catch(() => {});
  }, []);

  // Any edit after a save puts the button back to "Guardar" so "Guardado" never lies.
  function touch() {
    if (status === "saved") setStatus("idle");
  }

  function addPost() {
    const url = newPost.trim();
    if (!url) return;
    if (!INSTAGRAM_POST_RE.test(url)) {
      setNewPostError("Pegá el link de una publicación o reel (instagram.com/p/... o /reel/...).");
      return;
    }
    setInstagramPosts((prev) => [...prev, url]);
    setNewPost("");
    setNewPostError("");
    touch();
  }

  async function save() {
    setStatus("saving");
    setError("");

    // A "mostrar" toggle with nothing behind it just shows blank on the
    // profile — the API rejects this too, but catch it here for a clearer message.
    const missing = [
      instagramPublic && !instagramHandle.trim() && "tu usuario de Instagram",
      whatsappPublic && !whatsappNumber.trim() && "tu número de WhatsApp",
      aliasPublic && !alias.trim() && "tu alias",
      rafflePublic && !raffleUrl.trim() && "el link de tu rifa",
    ].filter(Boolean);
    if (!sport.trim()) missing.unshift("tu deporte");
    if (missing.length > 0) {
      setStatus("error");
      setError(`Completá ${missing[0]} antes de guardar.`);
      return;
    }

    // Blank rows (added but never filled in) get dropped rather than saved —
    // a title is the minimum for a logro to mean anything on the profile.
    const cleanAchievements = achievements
      .filter((a) => a.title.trim())
      .map((a) => ({ ...a, title: a.title.trim() }));

    try {
      const updated = await updateMe(accessToken, {
        ...(photoS3Key ? { photo_s3_key: photoS3Key } : {}),
        sport: sport.trim(),
        discipline: discipline.trim() || null,
        category: category.trim() || null,
        province: province || null,
        city: city.trim() || null,
        club: club.trim() || null,
        federation: federation.trim() || null,
        bio,
        story,
        achievements: cleanAchievements,
        instagram_handle: instagramHandle.trim().replace(/^@/, "") || undefined,
        instagram_public: instagramPublic,
        instagram_posts: instagramPosts,
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
      setInstagramPosts(updated.instagram_posts);
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
      touch();
    } catch (err) {
      setPhotoStatus("error");
      setPhotoError(err instanceof Error ? err.message : "No se pudo subir la foto");
    }
  }

  function updateAchievement(i: number, patch: Partial<Achievement>) {
    setAchievements((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
    touch();
  }

  // Wraps a setter so every field edit also resets the "Guardado" state.
  function on<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      touch();
    };
  }

  return (
    <div className="space-y-14">
      <Group title="Tu figurita" hint="Lo que se ve en el álbum y arriba de tu perfil.">
        <div className="flex items-center gap-5">
          <div className="aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-lg bg-celeste">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Tu foto de perfil" className="size-full object-cover" />
            ) : null}
          </div>
          <div>
            <label className="btn btn-secondary btn-sm cursor-pointer">
              {photoUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
            </label>
            <p className="field-hint">Vertical, con tu cara bien visible. JPG o PNG, hasta 5 MB.</p>
            {photoStatus === "uploading" && <p className="mt-1 text-sm text-accent">Subiendo...</p>}
            {photoStatus === "error" && <p className="mt-1 text-sm text-danger">{photoError}</p>}
            {photoS3Key && photoStatus === "idle" && (
              <p className="mt-1 text-sm text-verified">Lista. Guardá los cambios para publicarla.</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Deporte" value={sport} onChange={on(setSport)} list={sports} listId="dash-sports" required />
          <TextField label="Disciplina o prueba" value={discipline} onChange={on(setDiscipline)} placeholder="-63 kg, 100 m libre, maratón..." />
          <TextField label="Categoría" value={category} onChange={on(setCategory)} placeholder="Juvenil, Sub-20, Senior..." />
          <label className="block">
            <span className="field-label">Provincia</span>
            <select value={province} onChange={(e) => on(setProvince)(e.target.value)} className="input mt-1.5">
              <option value="">Sin especificar</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Ciudad" value={city} onChange={on(setCity)} placeholder="Mar del Plata" />
          <TextField label="Club" value={club} onChange={on(setClub)} placeholder="Club Atlético..." />
          <TextField label="Federación" value={federation} onChange={on(setFederation)} placeholder="Federación Argentina de..." />
        </div>
      </Group>

      <Group title="Tu historia" hint="Lo primero que lee quien entra a tu perfil.">
        <TextArea label="En una frase" value={bio} onChange={on(setBio)} rows={2} placeholder="Judoca marplatense, bicampeona nacional juvenil." />
        <TextArea
          label="Tu historia"
          value={story}
          onChange={on(setStory)}
          rows={6}
          placeholder="Cómo empezaste, qué lograste, qué se viene y para qué necesitás apoyo."
        />

        <div>
          <p className="field-label">Logros</p>
          <div className="mt-2 space-y-3">
            {achievements.map((a, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_10rem_auto]">
                <input
                  aria-label="Logro"
                  placeholder="Ej: Campeona nacional juvenil"
                  value={a.title}
                  onChange={(e) => updateAchievement(i, { title: e.target.value })}
                  className="input input-sm"
                />
                <input
                  type="date"
                  aria-label="Fecha"
                  value={a.date ?? ""}
                  onChange={(e) => updateAchievement(i, { date: e.target.value || undefined })}
                  className="input input-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAchievements((prev) => prev.filter((_, idx) => idx !== i));
                    touch();
                  }}
                  className="btn btn-sm text-muted-foreground hover:text-danger"
                >
                  Quitar
                </button>
                <input
                  aria-label="Detalle"
                  placeholder="Detalle (opcional)"
                  value={a.description ?? ""}
                  onChange={(e) => updateAchievement(i, { description: e.target.value || undefined })}
                  className="input input-sm sm:col-span-3"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAchievements((prev) => [...prev, { title: "" }])}
              className="text-sm font-semibold text-accent underline hover:no-underline"
            >
              Sumar un logro
            </button>
          </div>
        </div>
      </Group>

      <Group title="Instagram" hint="Elegí hasta 6 publicaciones o reels para mostrar en tu perfil.">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="field-label">Usuario</span>
            <span className="mt-1.5 flex items-stretch">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 font-semibold text-muted-foreground">
                @
              </span>
              <input
                autoCapitalize="none"
                spellCheck={false}
                value={instagramHandle}
                onChange={(e) => on(setInstagramHandle)(e.target.value.replace(/^@/, ""))}
                className="input rounded-l-none"
              />
            </span>
          </label>
          <Toggle label="Mostrar en mi perfil" checked={instagramPublic} onChange={on(setInstagramPublic)} />
        </div>

        <div>
          <p className="field-label">Publicaciones destacadas</p>
          {instagramPosts.length > 0 && (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {instagramPosts.map((url) => (
                <li key={url} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <InstagramIcon className="size-4 shrink-0 text-muted-foreground" />
                  <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                    {url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setInstagramPosts((prev) => prev.filter((p) => p !== url));
                      touch();
                    }}
                    className="font-semibold text-muted-foreground hover:text-danger"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {instagramPosts.length < MAX_INSTAGRAM_POSTS ? (
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Link de la publicación"
                inputMode="url"
                value={newPost}
                onChange={(e) => {
                  setNewPost(e.target.value);
                  setNewPostError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPost();
                  }
                }}
                placeholder="https://www.instagram.com/p/..."
                className="input flex-1"
              />
              <button type="button" onClick={addPost} className="btn btn-secondary">
                Agregar
              </button>
            </div>
          ) : (
            <p className="field-hint">Ya tenés 6. Quitá una para sumar otra.</p>
          )}
          {newPostError ? (
            <p className="mt-1.5 text-sm text-danger">{newPostError}</p>
          ) : (
            <p className="field-hint">En Instagram: tocá ··· en la publicación, «Copiar enlace», y pegalo acá.</p>
          )}
        </div>
      </Group>

      <Group title="Cómo te pueden bancar" hint="Codeportistas nunca toca este dinero: solo lo muestra para que te transfieran directo.">
        <div className="space-y-4 rounded-xl bg-sol-soft p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Alias" value={alias} onChange={on(setAlias)} placeholder="martina.judo.mp" />
            <TextField label="CBU / CVU (opcional)" value={cbu} onChange={on(setCbu)} inputMode="numeric" />
          </div>
          <Toggle label="Mostrar alias en mi perfil" checked={aliasPublic} onChange={on(setAliasPublic)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField label="WhatsApp" value={whatsappNumber} onChange={on(setWhatsappNumber)} placeholder="+54 9 11..." inputMode="tel" />
          <Toggle label="Mostrar en mi perfil" checked={whatsappPublic} onChange={on(setWhatsappPublic)} />
        </div>

        <div className="space-y-4">
          <TextField
            label="Link a tu rifa o sorteo"
            value={raffleUrl}
            onChange={on(setRaffleUrl)}
            placeholder="https://"
            inputMode="url"
          />
          <TextField label="De qué se trata (opcional)" value={raffleDescription} onChange={on(setRaffleDescription)} />
          <Toggle label="Mostrar la rifa en mi perfil" checked={rafflePublic} onChange={on(setRafflePublic)} />
          <p className="field-hint">La rifa la organizás vos, por fuera de la plataforma. Nosotros solo mostramos el link.</p>
        </div>
      </Group>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-border bg-background px-4 py-4 sm:-mx-6 sm:px-6">
        <button type="button" onClick={save} disabled={status === "saving"} className="btn btn-primary px-6">
          {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado" : "Guardar cambios"}
        </button>
        {status === "error" && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="group-title">{title}</h2>
        {hint && <p className="field-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  list,
  listId,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  list?: string[];
  listId?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={list ? listId : undefined}
        required={required}
        inputMode={inputMode}
        className="input mt-1.5"
      />
      {list && (
        <datalist id={listId}>
          {list.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input mt-1.5 leading-relaxed"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}
