// The product's signature object: every athlete is a figurita — photo on a
// celeste field inside a white frame, name on a navy strip. Used by the
// directory, the profile header, the landing stack and the live signup preview.

type FiguritaProps = {
  name: string;
  sport: string;
  place?: string | null;
  photoUrl?: string | null;
  verified?: boolean;
  campaign?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const nameSize = {
  sm: "text-[1.0625rem] sm:text-[1.375rem]",
  md: "text-[1.75rem]",
  lg: "text-[2.5rem]",
};

export function Figurita({
  name,
  sport,
  place,
  photoUrl,
  verified = false,
  campaign = false,
  size = "md",
  className = "",
}: FiguritaProps) {
  const displayName = name.trim() || "Tu nombre";
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-1.5 shadow-[0_1px_2px_rgb(14_27_51/0.06),0_8px_24px_-12px_rgb(14_27_51/0.25)] ${className}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-celeste">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="display absolute inset-0 flex items-center justify-center text-[5.5rem] text-on-celeste/25"
          >
            {initials(displayName) || "?"}
          </span>
        )}

        <span
          className={`absolute top-2 left-2 truncate rounded-md bg-surface/95 px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-foreground uppercase ${
            verified ? "max-w-[calc(100%-3rem)]" : "max-w-[calc(100%-1rem)]"
          }`}
        >
          {sport.trim() || "Deporte"}
        </span>

        {verified && (
          <span
            title="Perfil verificado por el equipo"
            className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-surface text-verified"
          >
            <CheckIcon className="size-4" />
            <span className="sr-only">Perfil verificado</span>
          </span>
        )}

        {campaign && (
          <span className="absolute bottom-0 left-0 bg-sol px-2 py-1 text-[0.6875rem] font-bold tracking-wide text-on-sol uppercase">
            Campaña activa
          </span>
        )}
      </div>

      <div className="mt-1.5 rounded-lg bg-ink px-2.5 pt-2 pb-2.5 text-on-ink">
        <p className={`display hyphens-none [overflow-wrap:anywhere] ${nameSize[size]}`}>{displayName}</p>
        <p className="mt-1 truncate text-xs text-on-ink/75">{place?.trim() || "Argentina"}</p>
      </div>
    </div>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function placeLabel(athlete: { city?: string | null; province?: string | null }) {
  return [athlete.city, athlete.province].filter(Boolean).join(", ") || "Argentina";
}
