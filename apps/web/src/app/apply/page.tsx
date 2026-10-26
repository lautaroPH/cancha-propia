"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitApplication, getMe, getSports, ApiError, type AthleteDetail } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES, SPORTS } from "@/lib/constants";
import { Figurita } from "@/components/figurita";

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
  const [sessionEmail, setSessionEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [reapplyAvailableAt, setReapplyAvailableAt] = useState<string | null>(null);
  // Rejected or still-pending applicant's previous submission — prefills the
  // form so resubmitting doesn't mean retyping everything from scratch.
  const [previous, setPrevious] = useState<AthleteDetail | null>(null);

  // Controlled so the figurita preview can fill in as the athlete types.
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sport, setSport] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const minor = useMemo(() => isMinor(dateOfBirth), [dateOfBirth]);

  const [sports, setSports] = useState<string[]>(SPORTS);
  useEffect(() => {
    getSports()
      .then((list) => list.length > 0 && setSports(list))
      .catch(() => {});
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
          if (athlete.status === "rejected") setReapplyAvailableAt(athlete.reapply_available_at);
          setPrevious(athlete);
          setFullName(athlete.full_name);
          setDateOfBirth(athlete.date_of_birth);
          setSport(athlete.sport);
          setProvince(athlete.province ?? "");
          setCity(athlete.city ?? "");
          setInstagram(athlete.instagram_handle ?? "");
          const previousLink = athlete.evidence.find((e) => e.kind === "federation_link")?.s3_key ?? "";
          setLink(previousLink);
          setShowLink(Boolean(previousLink));
          setStatus("idle");
        } else {
          // active/suspended — nothing to edit here, the dashboard owns the rest.
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const handle = instagram.trim().replace(/^@/, "");
    const trimmedLink = link.trim();
    if (!handle && !trimmedLink) {
      setStatus("error");
      setErrorMessage("Sumá tu Instagram o un link donde se vea tu carrera, así podemos revisar tu perfil.");
      return;
    }
    if (trimmedLink && !/^https?:\/\//.test(trimmedLink)) {
      setStatus("error");
      setErrorMessage("El link tiene que empezar con https://");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    const form = new FormData(e.currentTarget);

    try {
      await submitApplication(accessToken, {
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth,
        sport: sport.trim(),
        province: province || undefined,
        city: city.trim() || undefined,
        instagram_handle: handle || undefined,
        evidence_links: trimmedLink ? [trimmedLink] : [],
        guardian_email: minor ? String(form.get("guardian_email")) : undefined,
        guardian_consent: minor ? form.get("guardian_consent") === "on" : undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.status === 429) {
        setErrorMessage(
          reapplyAvailableAt
            ? `Todavía no podés volver a enviarla. Probá a partir del ${new Date(reapplyAvailableAt).toLocaleString("es-AR")}.`
            : "Todavía no podés volver a enviarla. Probá de nuevo más tarde."
        );
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Algo salió mal. Probá de nuevo.");
      }
    }
  }

  const place = [city, province].filter((v) => v.trim()).join(", ");
  const preview = (
    <Figurita name={fullName} sport={sport} place={place || null} size="md" className="w-full" />
  );

  if (status === "checking") {
    return <div className="min-h-[60vh]" />;
  }

  if (status === "done") {
    return (
      <div className="mx-auto grid max-w-4xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[240px_1fr] md:py-20">
        <div className="mx-auto w-52 -rotate-3 md:w-full">{preview}</div>
        <div>
          <h1 className="text-[3rem] sm:text-[3.75rem]">¡Tu figurita está en revisión!</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Nuestro equipo la revisa en los próximos días y te escribe a{" "}
            <span className="font-semibold text-foreground">{sessionEmail}</span>. Mientras tanto, completá tu perfil:
            foto, historia, logros y tus mejores posteos.
          </p>
          <Link href="/dashboard" className="btn btn-primary mt-8 px-6 py-3 text-base">
            Completar mi perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="mb-3 text-sm font-semibold text-muted-foreground">{previous ? "Tu postulación" : "Paso 2 de 2"}</p>
      <h1 className="text-[3rem] sm:text-[4rem]">{previous ? "Actualizá tu figurita" : "Armá tu figurita"}</h1>
      <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Cinco datos y listo. Foto, historia y todo lo demás lo sumás después desde tu panel.
      </p>

      {reapplyAvailableAt && new Date(reapplyAvailableAt) > new Date() && (
        <p className="mt-6 max-w-xl rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-strong">
          Tu postulación anterior no fue aprobada. Podés volver a enviarla a partir del{" "}
          {new Date(reapplyAvailableAt).toLocaleString("es-AR")}.
        </p>
      )}

      {previous?.status === "pending" && previous.info_requested_message && (
        <div className="mt-6 max-w-xl rounded-lg bg-sol-soft px-4 py-3">
          <p className="text-sm font-semibold">Nuestro equipo te pidió más información:</p>
          <p className="mt-1 text-sm">{previous.info_requested_message}</p>
        </div>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_260px] md:gap-14">
        <div className="mx-auto w-44 rotate-2 md:order-2 md:mx-0 md:w-full md:self-start md:sticky md:top-6" aria-hidden="true">
          {preview}
          <p className="mt-3 hidden text-center text-sm text-muted-foreground md:block">Así se va a ver en el álbum</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:order-1">
          <label className="block">
            <span className="field-label">Nombre y apellido</span>
            <input
              name="full_name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Martina López"
              className="input mt-1.5"
            />
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Deporte</span>
              <input
                name="sport"
                required
                list="sport-options"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="Judo"
                className="input mt-1.5"
              />
              <datalist id="sport-options">
                {sports.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="field-label">Fecha de nacimiento</span>
              <input
                name="date_of_birth"
                type="date"
                required
                autoComplete="bday"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input mt-1.5"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Provincia</span>
              <select
                name="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="input mt-1.5"
              >
                <option value="">Elegí tu provincia</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">
                Ciudad <span className="font-normal text-muted-foreground">(opcional)</span>
              </span>
              <input
                name="city"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mar del Plata"
                className="input mt-1.5"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="field-label">Tu Instagram</span>
              <span className="mt-1.5 flex items-stretch">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 font-semibold text-muted-foreground">
                  @
                </span>
                <input
                  name="instagram_handle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                  placeholder="martinalopez.judo"
                  className="input rounded-l-none"
                />
              </span>
            </label>
            <p className="field-hint">Lo usamos para confirmar que sos vos, y aparece en tu perfil.</p>

            {showLink ? (
              <label className="mt-4 block">
                <span className="field-label">Link a tu federación, ranking o resultados</span>
                <input
                  name="link"
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  className="input mt-1.5"
                />
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setShowLink(true)}
                className="mt-2 text-sm font-semibold text-accent underline hover:no-underline"
              >
                ¿No tenés Instagram? Sumá otro link
              </button>
            )}
          </div>

          {minor && (
            <fieldset className="space-y-4 rounded-xl bg-celeste-soft p-5">
              <legend className="sr-only">Autorización de tu madre, padre o tutor/a</legend>
              <p className="text-sm leading-relaxed">
                Como sos menor de edad, tu perfil necesita la autorización de tu madre, padre o tutor/a. Vos seguís
                manejando tu cuenta; esto es solo su permiso.
              </p>
              <label className="block">
                <span className="field-label">Su email</span>
                <input
                  name="guardian_email"
                  type="email"
                  required
                  defaultValue={previous?.guardian_email ?? undefined}
                  placeholder="ana@email.com"
                  className="input mt-1.5"
                />
              </label>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" name="guardian_consent" required className="mt-0.5 size-4 accent-[var(--accent)]" />
                Mi madre, padre o tutor/a sabe que me estoy sumando y autoriza que se publique mi perfil.
              </label>
            </fieldset>
          )}

          {status === "error" && (
            <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          )}

          <div>
            <button type="submit" disabled={status === "submitting"} className="btn btn-primary w-full py-3.5 text-base sm:w-auto sm:px-8">
              {status === "submitting" ? "Enviando..." : previous ? "Enviar de nuevo" : "Enviar mi figurita"}
            </button>
            {sessionEmail && (
              <p className="field-hint">
                Te avisamos a <span className="font-semibold text-foreground">{sessionEmail}</span> cuando esté
                publicada.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
