"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DevQuickSwitch } from "@/components/dev-quick-switch";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const invalidLink = searchParams.get("error") === "invalid_link";

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
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-foreground">Revisá tu email</h1>
        <p className="mt-3 text-muted-foreground">
          Te enviamos un enlace de acceso a <span className="font-medium text-foreground">{email}</span>.
          Abrilo desde este mismo dispositivo para entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-xl font-bold text-foreground">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Te mandamos un enlace mágico a tu email — sin contraseña.
      </p>

      {invalidLink && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Ese enlace ya no es válido. Pedí uno nuevo abajo.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-foreground/90">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </label>

        {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === "sending" ? "Enviando..." : "Enviar enlace de acceso"}
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
