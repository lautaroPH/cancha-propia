"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Postulaciones" },
  { href: "/admin/invites", label: "Invitaciones" },
  { href: "/admin/athletes", label: "Atletas" },
  { href: "/admin/reports", label: "Reportes" },
  { href: "/admin/campaigns/expiring", label: "Campañas vencidas" },
  { href: "/admin/sports", label: "Deportes" },
];

export function AdminNav() {
  const pathname = usePathname();
  // /admin/athletes/<id> belongs to "Atletas", not to the queue at /admin.
  const active = [...LINKS].reverse().find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));

  return (
    <nav aria-label="Administración" className="border-b border-border bg-surface-muted">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
        {LINKS.map((l) => {
          const isActive = active?.href === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
