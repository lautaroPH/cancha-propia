"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitApplication, uploadEvidenceFile, getMe, getSports, ApiError, type AthleteDetail } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES } from "@/lib/constants";

function isMinor(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  const ageMs = Date.now() - dob.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears < 18;
}

export default function ApplyPage() {
  const router = useRouter();
  // "checking": verifying login + whether this account already applied, before
  // showing anything — avoids a flash of the form for someone about to be redirected.
  const [status, setStatus] = useState<"checking" | "idle" | "submitting" | "done" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [reapplyAvailableAt, setReapplyAvailableAt] = useState<string | null>(null);
  // Rejected applicant's previous submission — used to prefill the form so
  // resubmitting doesn't mean retyping everything from scratch.
  const [previous, setPrevious] = useState<AthleteDetail | null>(null);
  const minor = useMemo(() => isMinor(dateOfBirth), [dateOfBirth]);

  const [idDocument, setIdDocument] = useState<{ s3_key: string; filename: string } | null>(null);
  const [idDocumentStatus, setIdDocumentStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [idDocumentError, setIdDocumentError] = useState("");

  const [selfieWithId, setSelfieWithId] = useState<{ s3_key: string; filename: string } | null>(null);
  const [selfieStatus, setSelfieStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [selfieError, setSelfieError] = useState("");

  const [sports, setSports] = useState<string[]>([]);
  useEffect(() => {
    getSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  // Applying requires being logged in — that's what lets us link the
  // application to your account directly (auth_user_id) instead of guessing
  // from a typed email. Also blocks applying twice, with one exception: a
  // rejected applicant can resubmit (after a cooldown, enforced server-side).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) {
        router.replace("/login?next=/apply");
        return;
      }
      setAccessToken(session.access_token);
      setSessionEmail(session.user.email ?? "");

      try {
        const athlete = await getMe(session.access_token);
        if (athlete.status === "rejected" || athlete.status === "pending") {
          // Rejected: resubmitting after the cooldown. Pending: still under
          // review, but editable any time — e.g. after an admin asks for more
          // info, or the applicant just spots their own mistake.
          if (athlete.status === "rejected") setReapplyAvailableAt(athlete.reapply_available_at);
          setPrevious(athlete);
          setDateOfBirth(athlete.date_of_birth);
          setStatus("idle");
        } else {
          // active/suspended — nothing to edit here, re-review requests go elsewhere.
          router.replace("/dashboard");
        }
      } catch (err) {
        // 403 = no application yet, the expected case — show the form.
        // Anything else is a real failure, surface it instead of guessing.
        if (err instanceof ApiError && err.status === 403) {
          setStatus("idle");
        } else {
          setErrorMessage(err instanceof Error ? err.message : "No se pudo verificar tu cuenta.");
          setStatus("error");
        }
      }
    });
  }, [router]);

  async function handleIdDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdDocumentStatus("uploading");
    setIdDocumentError("");
    try {
      const uploaded = await uploadEvidenceFile(accessToken, file);
      setIdDocument(uploaded);
      setIdDocumentStatus("idle");
    } catch (err) {
      setIdDocument(null);
      setIdDocumentStatus("error");
      setIdDocumentError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    }
  }

  async function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelfieStatus("uploading");
    setSelfieError("");
    try {
      const uploaded = await uploadEvidenceFile(accessToken, file);
      setSelfieWithId(uploaded);
      setSelfieStatus("idle");
    } catch (err) {
      setSelfieWithId(null);
      setSelfieStatus("error");
      setSelfieError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!idDocument) {
      setStatus("error");
      setErrorMessage("Subí una foto de tu DNI antes de enviar la postulación.");
      return;
    }
    if (!selfieWithId) {
      setStatus("error");
      setErrorMessage("Subí una selfie con tu DNI antes de enviar la postulación.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const form = new FormData(e.currentTarget);
    const evidenceLinksRaw = String(form.get("evidence_links") ?? "");

    try {
      await submitApplication(accessToken, {
        full_name: String(form.get("full_name")),
        date_of_birth: String(form.get("date_of_birth")),
        national_id: String(form.get("national_id")),
        province: String(form.get("province") || "") || undefined,
        city: String(form.get("city") || "") || undefined,
        sport: String(form.get("sport")),
        discipline: String(form.get("discipline") || "") || undefined,
        category: String(form.get("category") || "") || undefined,
        club: String(form.get("club") || "") || undefined,
        federation: String(form.get("federation") || "") || undefined,
        bio: String(form.get("bio") || "") || undefined,
        story: String(form.get("story") || "") || undefined,
        evidence_links: evidenceLinksRaw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        id_document_s3_key: idDocument.s3_key,
        id_document_filename: idDocument.filename,
        selfie_with_id_s3_key: selfieWithId.s3_key,
        selfie_with_id_filename: selfieWithId.filename,
        guardian_email: minor ? String(form.get("guardian_email")) : undefined,
        guardian_consent: minor ? form.get("guardian_consent") === "on" : undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.status === 429) {
        setErrorMessage(
          reapplyAvailableAt
            ? `Todavía no podés volver a postularte — podés intentar de nuevo a partir del ${new Date(
                reapplyAvailableAt
              ).toLocaleString("es-AR")}.`
            : "Todavía no podés volver a postularte. Probá de nuevo más tarde."
        );
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Algo salió mal. Intentá de nuevo.");
      }
    }
  }

  if (status === "checking") {
    return <div className="mx-auto max-w-xl px-6 py-16" />;
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">¡Recibimos tu postulación!</h1>
        <p className="mt-3 text-muted-foreground">
          Un administrador va a revisar tu información y evidencia en los próximos días. Te vamos a
          escribir a <span className="font-medium text-foreground">{sessionEmail}</span> apenas
          tengamos una respuesta.
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
      {sessionEmail && (
        <p className="mt-2 text-xs text-muted-foreground">
          Postulando con la cuenta <span className="font-medium text-foreground">{sessionEmail}</span> —
          ahí vamos a avisarte cuando la revisemos.
        </p>
      )}

      {reapplyAvailableAt && new Date(reapplyAvailableAt) > new Date() && (
        <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          Tu postulación anterior fue rechazada. Podés volver a postularte a partir del{" "}
          {new Date(reapplyAvailableAt).toLocaleString("es-AR")}.
        </p>
      )}

      {previous?.status === "pending" && previous.info_requested_message && (
        <div className="mt-4 rounded-lg border border-accent bg-accent-soft px-3 py-2">
          <p className="text-sm font-medium text-accent-strong">Un administrador pidió más información:</p>
          <p className="mt-1 text-sm text-foreground/90">{previous.info_requested_message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field
          label="Nombre completo"
          name="full_name"
          placeholder="Martina López"
          defaultValue={previous?.full_name}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Fecha de nacimiento"
            name="date_of_birth"
            type="date"
            defaultValue={previous?.date_of_birth}
            required
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <Field label="DNI" name="national_id" placeholder="30111222" required />
        </div>
        {previous && (
          <p className="-mt-3 text-xs text-muted-foreground">
            Por seguridad no guardamos tu DNI en texto plano — volvé a escribirlo.
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-foreground/90">Foto de tu DNI (frente)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleIdDocumentChange}
            className="mt-1 block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Es privado — solo lo ve el equipo que revisa tu identidad, nunca se publica en tu perfil.
          </p>
          {idDocumentStatus === "uploading" && <p className="mt-1 text-xs text-accent">Subiendo...</p>}
          {idDocumentStatus === "error" && <p className="mt-1 text-xs text-danger">{idDocumentError}</p>}
          {idDocument && idDocumentStatus === "idle" && (
            <p className="mt-1 text-xs text-verified">✓ {idDocument.filename} cargado</p>
          )}
          {previous?.evidence.some((e) => e.kind === "id_document") && !idDocument && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ya habías subido un documento — subí uno de nuevo para reemplazarlo.
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground/90">Selfie sosteniendo tu DNI</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelfieChange}
            className="mt-1 block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Una foto tuya con el DNI al lado de tu cara, bien visible. También privada.
          </p>
          {selfieStatus === "uploading" && <p className="mt-1 text-xs text-accent">Subiendo...</p>}
          {selfieStatus === "error" && <p className="mt-1 text-xs text-danger">{selfieError}</p>}
          {selfieWithId && selfieStatus === "idle" && (
            <p className="mt-1 text-xs text-verified">✓ {selfieWithId.filename} cargado</p>
          )}
          {previous?.evidence.some((e) => e.kind === "selfie_with_id") && !selfieWithId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ya habías subido una selfie — subí una de nuevo para reemplazarla.
            </p>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Deporte" name="sport" placeholder="Judo" list={sports} defaultValue={previous?.sport} required />
          <Field
            label="Categoría"
            name="category"
            placeholder="Juvenil, Sub-20, Senior..."
            defaultValue={previous?.category ?? undefined}
          />
        </div>
        <Field
          label="Disciplina / prueba / categoría de peso"
          name="discipline"
          placeholder="-63kg, estilos libres 100m, maratón..."
          defaultValue={previous?.discipline ?? undefined}
        />
        <p className="-mt-3 text-xs text-muted-foreground">
          La categoría es tu franja competitiva (edad o nivel); la disciplina es la prueba, estilo o
          categoría de peso específica dentro de tu deporte.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Provincia"
            name="province"
            placeholder="Buenos Aires"
            list={PROVINCES}
            defaultValue={previous?.province ?? undefined}
          />
          <Field label="Ciudad" name="city" placeholder="Mar del Plata" defaultValue={previous?.city ?? undefined} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Club"
            name="club"
            placeholder="Club Atlético River Plate"
            defaultValue={previous?.club ?? undefined}
          />
          <Field
            label="Federación"
            name="federation"
            placeholder="Federación Argentina de Judo"
            defaultValue={previous?.federation ?? undefined}
          />
        </div>

        <TextArea
          label="Breve biografía"
          name="bio"
          rows={2}
          placeholder="Una o dos frases sobre quién sos como atleta."
          defaultValue={previous?.bio ?? undefined}
        />
        <TextArea
          label="Tu historia deportiva"
          name="story"
          rows={4}
          placeholder="Cómo empezaste, tu trayectoria, y por qué necesitás apoyo ahora."
          defaultValue={previous?.story ?? undefined}
        />
        <TextArea
          label="Enlaces de evidencia (uno por línea)"
          name="evidence_links"
          rows={3}
          placeholder="Página de tu federación, ranking oficial, resultados de competencias, tu Instagram u otra red social donde se vea tu carrera deportiva..."
          defaultValue={previous?.evidence
            .filter((e) => e.kind === "federation_link")
            .map((e) => e.s3_key)
            .join("\n")}
          required
        />
        <p className="-mt-3 text-xs text-muted-foreground">
          Necesitamos al menos un enlace para poder verificar tu identidad y trayectoria — tu
          Instagram u otra red social también sirve como evidencia.
        </p>

        {minor && (
          <div className="space-y-4 rounded-lg border border-accent-soft bg-accent-soft/50 p-4">
            <p className="text-sm text-foreground/90">
              Como sos menor de edad, tu perfil público necesita la autorización de tu madre, padre o
              tutor/a legal. Vos seguís manejando tu propia cuenta — esto es solo su consentimiento.
            </p>
            <Field
              label="Email de tu madre, padre o tutor/a legal"
              name="guardian_email"
              type="email"
              placeholder="ana@example.com"
              defaultValue={previous?.guardian_email ?? undefined}
              required={minor}
            />
            <label className="flex items-start gap-2 text-sm text-foreground/90">
              <input
                type="checkbox"
                name="guardian_consent"
                required={minor}
                className="mt-0.5 size-4 rounded border-border text-accent focus:ring-accent"
              />
              Confirmo que mi madre, padre o tutor/a legal está al tanto de esta postulación y
              autoriza la publicación de mi perfil.
            </label>
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
  defaultValue,
  placeholder,
  list,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  list?: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const listId = list ? `${name}-options` : undefined;
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        list={listId}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
  name,
  rows,
  placeholder,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  rows: number;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground/90">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      />
    </label>
  );
}
