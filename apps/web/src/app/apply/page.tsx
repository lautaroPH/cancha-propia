"use client";

import { useMemo, useState } from "react";
import { submitApplication } from "@/lib/api";

function isMinor(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  const ageMs = Date.now() - dob.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears < 18;
}

export default function ApplyPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const minor = useMemo(() => isMinor(dateOfBirth), [dateOfBirth]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = new FormData(e.currentTarget);
    const evidenceLinksRaw = String(form.get("evidence_links") ?? "");

    try {
      await submitApplication({
        full_name: String(form.get("full_name")),
        date_of_birth: String(form.get("date_of_birth")),
        national_id: String(form.get("national_id")),
        province: String(form.get("province") || "") || undefined,
        sport: String(form.get("sport")),
        discipline: String(form.get("discipline") || "") || undefined,
        club: String(form.get("club") || "") || undefined,
        federation: String(form.get("federation") || "") || undefined,
        bio: String(form.get("bio") || "") || undefined,
        story: String(form.get("story") || "") || undefined,
        contact_email: String(form.get("contact_email")),
        evidence_links: evidenceLinksRaw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        guardian: minor
          ? {
              full_name: String(form.get("guardian_full_name")),
              relationship: String(form.get("guardian_relationship")),
              email: String(form.get("guardian_email")),
              phone: String(form.get("guardian_phone") || "") || undefined,
            }
          : undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Algo salió mal. Intentá de nuevo.");
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">¡Recibimos tu postulación!</h1>
        <p className="mt-3 text-muted-foreground">
          Un administrador va a revisar tu información y evidencia en los próximos días. Te vamos a
          escribir al email que dejaste apenas tengamos una respuesta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Postularme como atleta</h1>
      <p className="mt-2 text-muted-foreground">
        Esta información es privada y se usa solo para verificar tu identidad y trayectoria deportiva.
        Vos elegís después qué mostrar en tu perfil público.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Nombre completo" name="full_name" required />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Fecha de nacimiento"
            name="date_of_birth"
            type="date"
            required
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <Field label="DNI" name="national_id" required />
        </div>
        <Field label="Email de contacto" name="contact_email" type="email" required />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Deporte" name="sport" required />
          <Field label="Disciplina / categoría" name="discipline" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provincia" name="province" />
          <Field label="Club" name="club" />
        </div>
        <Field label="Federación" name="federation" />

        <TextArea label="Breve biografía" name="bio" rows={2} />
        <TextArea label="Tu historia deportiva" name="story" rows={4} />
        <TextArea
          label="Enlaces de evidencia (uno por línea)"
          name="evidence_links"
          rows={3}
          placeholder="Página de tu federación, ranking oficial, resultados de competencias..."
        />

        {minor && (
          <div className="space-y-4 rounded-lg border border-accent-soft bg-accent-soft/50 p-4">
            <p className="text-sm text-foreground/90">
              Como sos menor de edad, necesitamos los datos de tu madre, padre o tutor legal — ellos
              van a autorizar y controlar tu perfil.
            </p>
            <Field label="Nombre completo del tutor" name="guardian_full_name" required={minor} />
            <Field label="Relación (madre, padre, tutor legal...)" name="guardian_relationship" required={minor} />
            <Field label="Email del tutor" name="guardian_email" type="email" required={minor} />
            <Field label="Teléfono del tutor" name="guardian_phone" />
          </div>
        )}

        {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Enviando..." : "Enviar postulación"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
    </label>
  );
}
