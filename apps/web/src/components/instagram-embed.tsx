// Instagram's own per-post embed: the API stores canonical permalinks
// (https://www.instagram.com/p/<code>/ or /reel/<code>/), and appending
// "embed/" is the documented iframe endpoint — no token, no scraping.

export function InstagramEmbed({ url, title }: { url: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <iframe
        src={`${url.replace(/\/?$/, "/")}embed/`}
        title={title}
        loading="lazy"
        allowFullScreen
        scrolling="no"
        className="block h-[540px] w-full"
      />
    </div>
  );
}

export function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
