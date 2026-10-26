"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateInvite,
  adminDeleteInvite,
  adminRegenerateInviteLink,
  getSports,
  type AdminAthleteListItem,
} from "@/lib/api";
import { PROVINCES, SPORTS } from "@/lib/constants";
import { CopyButton } from "@/components/copy-button";
import { Figurita } from "@/components/figurita";

type Ready = { name: string; link: string };

function dmText(name: string, link: string) {
  const first = name.split(" ")[0];
  return [
    `¡Hola ${first}! 👋 Te escribo de Codeportistas, una plataforma gratuita para que atletas argentinos muestren su historia y reciban apoyo directo (la plata nunca pasa por nosotros).`,
    "",
    `Te armamos un borrador de tu perfil con lo que vimos en tu Instagram, para que veas cómo quedaría: ${link}`,
    "",
    "Es privado: solo lo ve quien tenga este link. Si te gusta, lo reclamás con tu email en dos minutos, corregís lo que quieras y lo publicás. Si no, no pasa nada y lo borramos.",
  ].join("\n");
}

export function InviteManager({ accessToken, invites }: { accessToken: string; invites: AdminAthleteListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<Ready | null>(null);

  const [fullName, setFullName] = useState("");
  const [sport, setSport] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [club, setClub] = useState("");
  const [instagram, setInstagram] = useState("");
  const [bio, setBio] = useState("");
  const [posts, setPosts] = useState("");

  const [sports, setSports] = useState<string[]>(SPORTS);
  useEffect(() => {
    getSports()
      .then((list) => list.length > 0 && setSports(list))
      .catch(() => {});
  }, []);

  function linkFor(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await adminCreateInvite(accessToken, {
        full_name: fullName.trim(),
        sport: sport.trim(),
        discipline: discipline.trim() || undefined,
        province: province || undefined,
        city: city.trim() || undefined,
        club: club.trim() || undefined,
        instagram_handle: instagram.trim().replace(/^@/, "") || undefined,
        bio: bio.trim() || undefined,
        instagram_posts: posts
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      setReady({ name: fullName.trim(), link: linkFor(created.token) });
      window.scrollTo({ top: 0, behavior: "smooth" });
      for (const reset of [setFullName, setSport, setDiscipline, setProvince, setCity, setClub, setInstagram, setBio, setPosts]) {
        reset("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(invite: AdminAthleteListItem) {
    setBusy(true);
    setError("");
    try {
      const fresh = await adminRegenerateInviteLink(accessToken, invite.id);
      setReady({ name: invite.full_name, link: linkFor(fresh.token) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el link");
    } finally {
      setBusy(false);
    }
  }

  async function remove(invite: AdminAthleteListItem) {
    if (!window.confirm(`¿Borrar el borrador de ${invite.full_name}? El link deja de funcionar.`)) return;
    setBusy(true);
    setError("");
    try {
      await adminDeleteInvite(accessToken, invite.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {ready && (
        <section className="rounded-xl bg-sol-soft p-5">
          <h2 className="group-title">Link listo para {ready.name.split(" ")[0]}</h2>
          <p className="field-hint">
            Copialo ahora: por seguridad no lo guardamos. Si lo perdés, generá uno nuevo (el anterior deja de andar).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-sm break-all">{ready.link}</code>
            <CopyButton value={ready.link} label="Copiar link" />
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="field-label">Mensaje para mandarle por Instagram</p>
              <CopyButton value={dmText(ready.name, ready.link)} label="Copiar mensaje" />
            </div>
            <p className="mt-2 rounded-lg bg-surface px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
              {dmText(ready.name, ready.link)}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
        <form onSubmit={create} className="space-y-5">
          <h2 className="group-title">Nuevo borrador</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre y apellido" value={fullName} onChange={setFullName} required />
            <label className="block">
              <span className="field-label">Deporte</span>
              <input
                required
                list="invite-sports"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="input mt-1.5"
              />
              <datalist id="invite-sports">
                {sports.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <Field label="Disciplina o prueba" value={discipline} onChange={setDiscipline} placeholder="400 m, -63 kg..." />
            <label className="block">
              <span className="field-label">Provincia</span>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="input mt-1.5">
                <option value="">Sin especificar</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Ciudad" value={city} onChange={setCity} />
            <Field label="Club" value={club} onChange={setClub} />
          </div>
          <label className="block">
            <span className="field-label">Instagram</span>
            <span className="mt-1.5 flex items-stretch">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 font-semibold text-muted-foreground">
                @
              </span>
              <input
                autoCapitalize="none"
                spellCheck={false}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                className="input rounded-l-none"
              />
            </span>
          </label>
          <Field
            label="En una frase"
            value={bio}
            onChange={setBio}
            placeholder="Atleta de Roca, convocado al Sudamericano de Chile."
          />
          <label className="block">
            <span className="field-label">Publicaciones de Instagram (una por línea, hasta 6)</span>
            <textarea
              rows={3}
              value={posts}
              onChange={(e) => setPosts(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              className="input mt-1.5"
            />
            <span className="field-hint block">
              Solo lo público y deportivo. No cargues alias, teléfono ni fecha de nacimiento: eso lo completa el atleta.
            </span>
          </label>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Creando..." : "Crear borrador y link"}
          </button>
        </form>

        <div className="hidden lg:block" aria-hidden="true">
          <Figurita
            name={fullName}
            sport={sport}
            place={[city, province].filter(Boolean).join(", ") || null}
            size="sm"
            className="sticky top-6 rotate-2"
          />
        </div>
      </div>

      <section>
        <h2 className="group-title">Borradores sin reclamar</h2>
        {invites.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
            Todavía no hay borradores. Cuando un atleta reclama el suyo, pasa a Postulaciones.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{invite.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {invite.sport}
                    {invite.province ? ` · ${invite.province}` : ""} · creado el{" "}
                    {new Date(invite.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => regenerate(invite)} className="btn btn-secondary btn-sm">
                    Nuevo link
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(invite)} className="btn btn-danger btn-sm">
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input mt-1.5"
      />
    </label>
  );
}
