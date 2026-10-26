import Link from "next/link";
import { listAthletes, type AthleteCard } from "@/lib/api";
import { CheckIcon, Figurita, placeLabel } from "@/components/figurita";

async function loadRecent(): Promise<AthleteCard[]> {
  // The landing must still render if the API is down — the album just stays empty.
  try {
    return await listAthletes();
  } catch {
    return [];
  }
}

function isFullyVerified(a: AthleteCard) {
  return a.identity_verified && a.career_verified && a.competition_verified;
}

const fan = ["-rotate-3 translate-y-6", "z-10 -translate-y-2", "rotate-3 translate-y-8"];

export default async function LandingPage() {
  const athletes = await loadRecent();
  const stack = athletes.slice(0, 3);

  return (
    <div>
      <section className="overflow-hidden bg-celeste text-on-celeste">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-24">
          <div>
            <h1 className="text-[3.25rem] sm:text-[4.5rem] lg:text-[5.5rem]">
              Bancá a los atletas que te representan
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-celeste/85">
              Deportistas argentinos que se pagan sus viajes, su equipo y sus inscripciones. Conocé su historia y
              ayudalos directo, sin intermediarios.
            </p>

            <form action="/athletes" method="get" className="mt-8 flex max-w-lg gap-2">
              <label htmlFor="hero-search" className="sr-only">
                Buscar atletas
              </label>
              <input
                id="hero-search"
                type="search"
                name="q"
                placeholder="Deporte, provincia o nombre"
                className="input min-w-0 flex-1 border-transparent"
              />
              <button type="submit" className="btn bg-ink text-on-ink hover:opacity-90">
                Buscar
              </button>
            </form>

            <p className="mt-6 text-sm">
              ¿Sos atleta?{" "}
              <Link href="/apply" className="font-bold underline hover:no-underline">
                Armá tu figurita en un par de minutos
              </Link>
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-xl justify-center" aria-hidden={stack.length === 0}>
            {stack.length > 0 ? (
              <div className="grid w-full grid-cols-3 items-start gap-2 sm:gap-3">
                {stack.map((a, i) => (
                  <Link
                    key={a.slug}
                    href={`/athletes/${a.slug}`}
                    className={`figurita-link block ${fan[i]}`}
                  >
                    <Figurita
                      name={a.full_name}
                      sport={a.sport}
                      place={placeLabel(a)}
                      photoUrl={a.photo_url}
                      verified={isFullyVerified(a)}
                      size="sm"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="w-56 rotate-3">
                <Figurita name="Tu nombre acá" sport="Tu deporte" place="Tu provincia" size="md" />
                <p className="mt-3 text-center text-sm font-semibold">Ejemplo</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="display text-[2.5rem] sm:text-[3.25rem]">Cómo funciona</h2>
        <dl className="mt-8 grid gap-x-10 border-t border-border sm:grid-cols-3">
          <HowItWorks
            term="Encontrá"
            detail="Buscá por deporte, provincia o competencias próximas. Cada atleta tiene su figurita en el álbum."
          />
          <HowItWorks
            term="Conocé"
            detail="Su historia, sus logros, sus publicaciones de Instagram y lo que necesita para la próxima competencia."
          />
          <HowItWorks
            term="Bancá"
            detail="Si decidís ayudar, transferís directo a su alias o participás de su rifa. La plata nunca pasa por nosotros."
          />
        </dl>
      </section>

      {athletes.length > 0 && (
        <section className="bg-surface-muted">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="display text-[2.5rem] sm:text-[3.25rem]">Últimos en el álbum</h2>
              <Link href="/athletes" className="font-semibold text-accent hover:underline">
                Ver todos los atletas
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {athletes.slice(0, 8).map((a) => (
                <Link key={a.slug} href={`/athletes/${a.slug}`} className="figurita-link block">
                  <Figurita
                    name={a.full_name}
                    sport={a.sport}
                    place={placeLabel(a)}
                    photoUrl={a.photo_url}
                    verified={isFullyVerified(a)}
                    campaign={a.has_active_campaign}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-ink text-on-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <h2 className="display text-[2.5rem] sm:text-[3.25rem]">Nunca tocamos el dinero</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-on-ink/80">
              Codeportistas no es una billetera ni un procesador de pagos. Cuando apoyás a un atleta, la
              transferencia va de tu cuenta a la suya, por el alias o CBU que publica en su perfil. Nuestro trabajo
              es que encuentres historias reales y que sepas que la persona es quien dice ser.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold">Qué revisa nuestro equipo</h3>
            <p className="mt-2 text-sm text-on-ink/70">
              Cada perfil pasa por una revisión manual antes de publicarse. Puede mostrar hasta tres sellos:
            </p>
            <ul className="mt-6 space-y-5">
              <Seal title="Identidad" detail="Que la persona detrás del perfil es quien dice ser, por sus redes y referencias." />
              <Seal title="Trayectoria" detail="Su vínculo con el club, la federación o la disciplina que declara." />
              <Seal title="Competencia" detail="Que compite o fue convocada a la competencia que menciona." />
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-celeste text-on-celeste">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="display text-[2.5rem] sm:text-[3.25rem]">¿Sos atleta?</h2>
            <p className="mt-3 max-w-lg text-lg text-on-celeste/85">
              Creá tu cuenta con tu email, contanos tu deporte y tu Instagram, y listo. Lo demás lo completás cuando
              quieras. Es gratis.
            </p>
          </div>
          <Link href="/apply" className="btn bg-ink px-6 py-3 text-base text-on-ink hover:opacity-90">
            Armá tu figurita
          </Link>
        </div>
      </section>
    </div>
  );
}

function HowItWorks({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="border-b border-border py-6 sm:border-b-0">
      <dt className="display text-[2rem] text-accent">{term}</dt>
      <dd className="mt-2 leading-relaxed text-muted-foreground">{detail}</dd>
    </div>
  );
}

function Seal({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-celeste text-on-celeste">
        <CheckIcon className="size-3.5" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-on-ink/70">{detail}</p>
      </div>
    </li>
  );
}
