import type { Metadata } from "next";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth-nav";
import { BrandLink } from "@/components/brand";
import { themeInitScript } from "@/lib/theme-script";
import "./globals.css";

// Archivo (Omnibus-Type, Buenos Aires) — one variable family for everything:
// the width axis gives the condensed display voice, normal width sets the body.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Codeportistas",
  description: "Descubrí y apoyá a los atletas argentinos que necesitan una mano para competir.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {/* Plain script, not next/script — must run before paint to avoid a theme flash,
            and next/script's beforeInteractive path doesn't play well with this Next version. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <header className="bg-celeste text-on-celeste">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <BrandLink />
            <nav className="flex items-center gap-3 sm:gap-5">
              <Link href="/athletes" className="text-sm font-semibold hover:underline">
                Atletas
              </Link>
              <AuthNav />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-semibold text-foreground">Codeportistas</span> nunca toca el dinero: cada
              aporte va directo al atleta.
            </p>
            <Link href="/apply" className="font-semibold text-accent hover:underline">
              Soy atleta, quiero mi perfil
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
