"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { claimInvite, ApiError, type AthleteProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES } from "@/lib/constants";

function isMinor(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const ageMs = Date.now() - new Date(dateOfBirth).getTime();
  return ageMs / (1000 * 60 * 60 * 24 * 365.25) < 18;
}

export function ClaimPanel({ token, draft }: { token: string; draft: AthleteProfile }) {
  // undefined = still checking the session
  const [session, setSession] = useState<{ token: string; email: string } | null | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [alreadyHasProfile, setAlreadyHasProfile] = useState(false);

  const [fullName, setFullName] = useState(draft.full_name);
  const [sport, setSport] = useState(draft.sport);
  const [province, setProvince] = useState(draft.province ?? "");
  const [city, setCity] = useState(draft.city ?? "");
  const [instagram, setInstagram] = useState(draft.instagram_handle ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const minor = useMemo(() => isMinor(dateOfBirth), [dateOfBirth]);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) =>
        setSession(data.session ? { token: data.session.access_token, email: data.session.user.email ?? "" } : null)
      );
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session) return;
    setStatus("submitting");
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await claimInvite(session.token, token, {
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth,
        sport: sport.trim(),
        province: province || undefined,
        city: city.trim() || undefined,
        instagram_handle: instagram.trim().replace(/^@/, "") || undefined,
        // Keep the line the admin wrote; the athlete can rewrite it from the dashboard.
        bio: draft.bio ?? undefined,
        evidence_links: [],
        guardian_email: minor ? String(form.get("guardian_email")) : undefined,
        guardian_consent: minor ? form.get("guardian_consent") === "on" : undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyHasProfile(true);
        setError("Esta cuenta ya tiene un perfil de atleta.");
      } else {
        setError(err instanceof Error ? err.message : "No se pudo reclamar. Probá de nuevo.");
      }
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl bg-verified-soft p-6">
        <h2 className="display text-[2rem]">¡Es tuya!</h2>
        <p className="mt-2 leading-relaxed">
          La revisamos en los próximos días y te avisamos a <span className="font-semibold">{session?.email}</span>.
          Mientras tanto, sumá tu foto, tu historia y tus logros.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-5 w-full">
          Completar mi perfil
        </Link>
      </div>
    );
  }

  if (session === undefined) return <div className="h-64 rounded-xl border border-border" />;

  if (session === null) {
    return (
      <div className="rounded-xl border border-border p-6">
        <h2 className="display text-[2rem]">¿Es tu perfil?</h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Reclamalo con tu email: te mandamos un link para entrar, sin contraseña. Después confirmás tus datos y
          listo.
        </p>
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="btn btn-primary mt-5 w-full py-3">
          Sí, es mío: reclamarlo
        </Link>
        <p className="mt-3 text-center text-sm text-muted-foreground">Gratis. Nada se publica sin tu OK.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-border p-6">
      <div>
        <h2 className="display text-[2rem]">Confirmá tus datos</h2>
        <p className="field-hint">
          Entraste como <span className="font-semibold text-foreground">{session.email}</span>.
        </p>
      </div>

      <Field label="Nombre y apellido" value={fullName} onChange={setFullName} required />
      <Field label="Deporte" value={sport} onChange={setSport} required />
      <label className="block">
        <span className="field-label">Fecha de nacimiento</span>
        <input
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="input mt-1.5"
        />
      </label>
      <label className="block">
        <span className="field-label">Provincia</span>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="input mt-1.5">
          <option value="">Elegí tu provincia</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <Field label="Ciudad" value={city} onChange={setCity} />
      <label className="block">
        <span className="field-label">Tu Instagram</span>
        <span className="mt-1.5 flex items-stretch">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 font-semibold text-muted-foreground">
            @
          </span>
          <input
            required
            autoCapitalize="none"
            spellCheck={false}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
            className="input rounded-l-none"
          />
        </span>
      </label>

      {minor && (
        <fieldset className="space-y-4 rounded-xl bg-celeste-soft p-4">
          <legend className="sr-only">Autorización de tu madre, padre o tutor/a</legend>
          <p className="text-sm leading-relaxed">
            Como sos menor de edad, tu perfil necesita la autorización de tu madre, padre o tutor/a.
          </p>
          <label className="block">
            <span className="field-label">Su email</span>
            <input name="guardian_email" type="email" required className="input mt-1.5" />
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="guardian_consent" required className="mt-0.5 size-4 accent-[var(--accent)]" />
            Mi madre, padre o tutor/a sabe que me estoy sumando y autoriza que se publique mi perfil.
          </label>
        </fieldset>
      )}

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}{" "}
          {alreadyHasProfile && (
            <Link href="/dashboard" className="font-semibold underline">
              Ir a mi panel
            </Link>
          )}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn btn-primary w-full py-3">
        {status === "submitting" ? "Reclamando..." : "Es mío, mandarlo a revisión"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="input mt-1.5" />
    </label>
  );
}
