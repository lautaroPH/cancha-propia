// Not a client module on purpose: server pages call statusLabel() while
// rendering, and a function exported from a "use client" file can't be
// called on the server (it crashed /admin/athletes).

const STATUS: Record<string, { label: string; className: string }> = {
  invited: { label: "Invitación", className: "bg-celeste-soft text-foreground" },
  pending: { label: "En revisión", className: "bg-sol-soft text-foreground" },
  active: { label: "Publicado", className: "bg-verified-soft text-verified" },
  rejected: { label: "Rechazado", className: "bg-danger-soft text-danger" },
  suspended: { label: "Suspendido", className: "bg-surface-muted text-muted-foreground" },
};

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status;
}

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, className: "bg-surface-muted text-muted-foreground" };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}
