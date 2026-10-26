"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DevQuickSwitch } from "@/components/dev-quick-switch";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const invalidLink = searchParams.get("error") === "invalid_link";
  // Arriving from "Crear perfil" — same magic link either way (it creates the
  // account on first use), but the copy should say what's actually happening.
  const signingUp = next === "/apply";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <h1 className="text-[2.75rem]">Revisá tu email</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Te mandamos un enlace a <span className="font-semibold text-foreground">{email}</span>. Abrilo desde este
          mismo celular o compu y entrás directo{signingUp ? " a armar tu figurita" : ""}.
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-6 text-sm font-semibold text-accent underline">
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      {signingUp && <p className="mb-3 text-sm font-semibold text-muted-foreground">Paso 1 de 2</p>}
      <h1 className="text-[2.75rem]">{signingUp ? "Creá tu cuenta" : "Entrá o creá tu cuenta"}</h1>
      <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
        Solo tu email. Te mandamos un enlace para entrar, sin contraseña.
      </p>

      {invalidLink && (
        <p className="mt-6 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Ese enlace ya venció o ya se usó. Pedí uno nuevo abajo.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="field-label">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@email.com"
            className="input mt-1.5"
          />
        </label>

        {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}

        <button type="submit" disabled={status === "sending"} className="btn btn-primary w-full py-3 text-base">
          {status === "sending" ? "Enviando..." : "Mandame el enlace"}
        </button>
      </form>

      {process.env.NODE_ENV === "development" && <DevQuickSwitch />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
