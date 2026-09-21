import Link from "next/link";
import { getAthleteFacets, listAthletes } from "@/lib/api";

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-0.5 text-xs font-medium text-verified">
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clipRule="evenodd"
        />
      </svg>
      Athlete verified
    </span>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DirectoryPage(props: PageProps<"/athletes">) {
  const sp = await props.searchParams;
  const q = first(sp.q) ?? "";
  const sport = first(sp.sport) ?? "";
  const province = first(sp.province) ?? "";
  const verified = first(sp.verified) === "true";
  const hasUpcoming = first(sp.has_upcoming_competition) === "true";

  const [athletes, facets] = await Promise.all([
    listAthletes({
      q: q || undefined,
      sport: sport || undefined,
      province: province || undefined,
      verified: verified || undefined,
      has_upcoming_competition: hasUpcoming || undefined,
    }),
    getAthleteFacets(),
  ]);

  const hasActiveFilters = q || sport || province || verified || hasUpcoming;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Cancha Propia</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Descubrí a los atletas que representan a la Argentina
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Perfiles verificados de deportistas de alto rendimiento que necesitan apoyo para competir.
          Su historia primero — el aporte es una decisión tuya, directo a ellos.
        </p>
      </header>

      <form className="mb-8 rounded-xl border border-border bg-surface p-4" method="get">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, deporte, club, provincia..."
            className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
          <select
            name="sport"
            defaultValue={sport}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">Todos los deportes</option>
            {facets.sports.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="province"
            defaultValue={province}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">Todas las provincias</option>
            {facets.provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="verified"
              value="true"
              defaultChecked={verified}
              className="size-4 rounded border-border accent-accent"
            />
            Solo perfiles con verificación completa
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="has_upcoming_competition"
              value="true"
              defaultChecked={hasUpcoming}
              className="size-4 rounded border-border accent-accent"
            />
            Con competencia próxima
          </label>
          <div className="ml-auto flex items-center gap-3">
            {hasActiveFilters && (
              <Link href="/athletes" className="text-sm text-muted-foreground hover:text-accent">
                Limpiar filtros
              </Link>
            )}
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Buscar
            </button>
          </div>
        </div>
      </form>

      {athletes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          {hasActiveFilters
            ? "No encontramos atletas con esos filtros."
            : "Todavía no hay atletas publicados."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => (
            <Link
              key={athlete.slug}
              href={`/athletes/${athlete.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted">
                {athlete.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={athlete.photo_url}
                    alt={athlete.full_name}
                    className="size-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">Sin foto</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-foreground">{athlete.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {athlete.sport}
                  {athlete.discipline ? ` · ${athlete.discipline}` : ""}
                  {athlete.city || athlete.province
                    ? ` · ${[athlete.city, athlete.province].filter(Boolean).join(", ")}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {athlete.identity_verified && athlete.career_verified && athlete.competition_verified && (
                    <VerifiedBadge />
                  )}
                  {athlete.has_active_campaign && (
                    <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                      Campaña activa
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
