import Link from "next/link";

// Albiceleste jersey stripes as the mark — the shirt, not the flag.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 24" aria-hidden="true" className={className}>
      <rect x="0.5" y="0.5" width="19" height="23" rx="2.5" fill="#ffffff" stroke="currentColor" />
      <rect x="4" y="1" width="4" height="22" fill="#74acdf" />
      <rect x="12" y="1" width="4" height="22" fill="#74acdf" />
    </svg>
  );
}

export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-2 text-on-celeste">
      <BrandMark className="h-5 w-4 sm:h-6 sm:w-5" />
      <span className="display text-[1.25rem] leading-none sm:text-[1.625rem]">Codeportistas</span>
    </Link>
  );
}
