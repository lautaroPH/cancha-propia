import Link from "next/link";
import { listAthletes } from "@/lib/api";

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

export default async function DirectoryPage() {
  const athletes = await listAthletes();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Cancha Propia</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Descubrí a los atletas que representan a la Argentina
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Perfiles verificados de deportistas de alto rendimiento que necesitan apoyo para competir.
          Su historia primero — el aporte es una decisión tuya, directo a ellos.
        </p>
      </header>

      {athletes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          Todavía no hay atletas publicados.
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
