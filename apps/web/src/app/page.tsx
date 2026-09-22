import Link from "next/link";

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
        {number}
      </span>
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BadgeExplainer({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-verified-soft text-verified">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Codeportistas</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Encontrá y apoyá a atletas argentinos que necesitan una mano para competir
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Muchos deportistas de alto rendimiento financian viajes, equipamiento e inscripciones a
            competencias con sus propios medios. Codeportistas reúne sus perfiles verificados en un solo
            lugar para que cualquiera pueda conocer su historia y decidir ayudarlos — directo, sin
            intermediarios.
          </p>
          <form action="/athletes" method="get" className="mt-8 max-w-lg">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-4 shadow-sm transition focus-within:border-accent">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="search"
                name="q"
                placeholder="Buscá por deporte, provincia o nombre..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Buscar
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/athletes" className="font-medium text-accent hover:underline">
              Ver todos los atletas →
            </Link>
            <Link href="/apply" className="font-medium text-foreground hover:text-accent">
              Soy atleta, quiero postularme →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-foreground">Cómo funciona</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StepCard
            number="1"
            title="Buscá un atleta"
            description="Filtrá por deporte, provincia o competencias próximas y conocé su historia, sus logros y sus objetivos."
          />
          <StepCard
            number="2"
            title="Revisá su verificación"
            description="Cada perfil muestra qué datos confirmó el equipo de Codeportistas: identidad, trayectoria deportiva y participación en competencias."
          />
          <StepCard
            number="3"
            title="Aportá directo a la persona"
            description="Si decidís colaborar, lo hacés por alias o CBU directo al atleta. Nosotros no procesamos ni retenemos el dinero en ningún momento."
          />
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold text-foreground">Nunca tocamos el dinero</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Codeportistas es una plataforma de descubrimiento y confianza, no una billetera ni un
            procesador de pagos. No recibimos, retenemos ni transferimos fondos. Cuando decidís apoyar a
            un atleta, la transferencia va directo de tu cuenta a la de él o ella, por los medios que el
            propio atleta publica en su perfil (alias, CBU). Nuestro trabajo es ayudarte a encontrar
            historias reales y verificar que la persona detrás del perfil es quien dice ser.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-foreground">Qué significa un perfil verificado</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Antes de publicarse, cada postulación pasa por una revisión manual. Un perfil puede mostrar
          hasta tres insignias independientes, según lo que el equipo pudo confirmar:
        </p>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <BadgeExplainer
            title="Identidad"
            description="Confirmamos que la persona detrás del perfil es quien dice ser."
          />
          <BadgeExplainer
            title="Trayectoria deportiva"
            description="Confirmamos su vínculo con el club, federación o disciplina que declara."
          />
          <BadgeExplainer
            title="Participación en competencias"
            description="Confirmamos que compite o fue convocado a la competencia que menciona."
          />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Los perfiles se revisan periódicamente para mantener la información al día, y cualquiera puede
          reportar un perfil que le parezca sospechoso.
        </p>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground">¿Sos un atleta de alto rendimiento?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Publicá tu perfil y contá tu historia. Es gratis y la revisión de tu postulación está a cargo
            de nuestro equipo.
          </p>
          <Link
            href="/apply"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Postularme como atleta
          </Link>
        </div>
      </section>
    </div>
  );
}
