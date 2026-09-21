"use client";

import { useState } from "react";
import { adminGetEvidenceDownloadUrl } from "@/lib/api";

export function ViewEvidenceButton({
  athleteId,
  evidenceId,
  accessToken,
}: {
  athleteId: string;
  evidenceId: string;
  accessToken: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const { url } = await adminGetEvidenceDownloadUrl(accessToken, athleteId, evidenceId);
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el documento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        onClick={open}
        disabled={busy}
        className="text-accent hover:underline disabled:opacity-50"
      >
        {busy ? "Abriendo..." : "Ver documento"}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
    </span>
  );
}
