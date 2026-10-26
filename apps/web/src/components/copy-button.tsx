"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context, permissions) — the value is
      // still on screen to select by hand, so there's nothing to recover.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-sol btn-sm min-w-24" aria-live="polite">
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
