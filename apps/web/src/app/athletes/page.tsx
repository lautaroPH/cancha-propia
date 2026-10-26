import Link from "next/link";
import { getAthleteFacets, listAthletes } from "@/lib/api";
import { Figurita, placeLabel } from "@/components/figurita";

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
    <div>
      <section className="bg-celeste text-on-celeste">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-12">
          <h1 className="text-[2.75rem] sm:text-[4rem]">El álbum de atletas</h1>
          <p className="mt-3 max-w-2xl text-on-celeste/85">
            Deportistas de alto rendimiento revisados por nuestro equipo. Su historia primero; el aporte es una
            decisión tuya, directo a ellos.
          </p>

          <form className="mt-8" method="get">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="q" className="sr-only">
                Buscar
              </label>
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nombre, deporte, club, provincia..."
                className="input flex-1 border-transparent"
              />
              <select
                name="sport"
                defaultValue={sport}
                aria-label="Deporte"
                className="input border-transparent sm:w-48"
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
                aria-label="Provincia"
                className="input border-transparent sm:w-48"
              >
                <option value="">Todas las provincias</option>
                {facets.provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn bg-ink text-on-ink hover:opacity-90">
                Buscar
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="verified"
                  value="true"
                  defaultChecked={verified}
                  className="size-4 accent-[var(--ink)]"
                />
                Con los tres sellos
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="has_upcoming_competition"
                  value="true"
                  defaultChecked={hasUpcoming}
                  className="size-4 accent-[var(--ink)]"
                />
                Con competencia próxima
              </label>
              {hasActiveFilters && (
                <Link href="/athletes" className="font-semibold underline hover:no-underline">
                  Limpiar filtros
                </Link>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {athletes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="display text-[2rem]">
              {hasActiveFilters ? "No hay figuritas con esos filtros" : "El álbum todavía está vacío"}
            </p>
            <p className="mt-2 text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  Probá con otro deporte o provincia, o{" "}
                  <Link href="/athletes" className="font-semibold text-accent underline">
                    mirá todo el álbum
                  </Link>
                  .
                </>
              ) : (
                <>
                  ¿Sos atleta?{" "}
                  <Link href="/apply" className="font-semibold text-accent underline">
                    Sé de los primeros en armar tu figurita
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {athletes.length === 1 ? "1 atleta" : `${athletes.length} atletas`}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {athletes.map((athlete) => (
                <Link key={athlete.slug} href={`/athletes/${athlete.slug}`} className="figurita-link block">
                  <Figurita
                    name={athlete.full_name}
                    sport={athlete.discipline ? `${athlete.sport} · ${athlete.discipline}` : athlete.sport}
                    place={placeLabel(athlete)}
                    photoUrl={athlete.photo_url}
                    verified={athlete.identity_verified && athlete.career_verified && athlete.competition_verified}
                    campaign={athlete.has_active_campaign}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
