import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNav } from "@/components/auth-nav";
import { themeInitScript } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cancha Propia",
  description: "Descubrí y apoyá a los atletas argentinos que necesitan una mano para competir.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Plain script, not next/script — must run before paint to avoid a theme flash,
            and next/script's beforeInteractive path doesn't play well with this Next version. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <nav className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-bold text-foreground">
              Cancha Propia
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/apply"
                className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Postularme
              </Link>
              <AuthNav />
              <ThemeToggle />
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
