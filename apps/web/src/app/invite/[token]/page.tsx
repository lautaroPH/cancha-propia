import type { Metadata } from "next";
import Link from "next/link";
import { getInvite } from "@/lib/api";
import { Figurita, placeLabel } from "@/components/figurita";
import { InstagramEmbed } from "@/components/instagram-embed";
import { ClaimPanel } from "./claim-panel";

// A private draft: whoever has the link can see it, search engines can't.
export const metadata: Metadata = {
  title: "Tu perfil en Codeportistas",
  robots: { index: false, follow: false },
};

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const draft = await getInvite(token).catch(() => null);

  if (!draft) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <h1 className="text-[2.75rem]">Este link ya no funciona</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Puede que ya hayas reclamado tu perfil o que te hayamos mandado uno nuevo. Si ya tenés cuenta,{" "}
          <Link href="/dashboard" className="font-semibold text-accent underline">
            entrá a tu panel
          </Link>
          ; si no, podés{" "}
          <Link href="/apply" className="font-semibold text-accent underline">
            armar tu figurita
          </Link>{" "}
          igual.
        </p>
      </div>
    );
  }

  const firstName = draft.full_name.split(" ")[0];

  return (
    <div>
      <section className="bg-celeste text-on-celeste">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-12 sm:px-6 md:grid-cols-[260px_1fr] md:items-end md:pt-12">
          <Figurita
            name={draft.full_name}
            sport={draft.discipline ? `${draft.sport} · ${draft.discipline}` : draft.sport}
            place={placeLabel(draft)}
            photoUrl={draft.photo_url}
            size="md"
            className="mx-auto w-56 -rotate-2 md:mx-0 md:w-full"
          />
          <div>
            <p className="inline-flex rounded-full bg-surface px-3 py-1 text-sm font-semibold text-foreground">
              Borrador privado · solo lo ve quien tiene este link
            </p>
            <h1 className="mt-4 text-[3rem] sm:text-[4.5rem]">{firstName}, esta es tu figurita</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-on-celeste/85">
              La armamos con lo que vimos en tu Instagram para que veas cómo quedaría tu perfil en Codeportistas. Si
              te gusta, reclamala con tu email, corregí lo que quieras y la publicamos. La plata de quienes te apoyen
              va directo a vos: nosotros nunca la tocamos.
            </p>
            {draft.bio && <p className="mt-4 max-w-2xl font-semibold">“{draft.bio}”</p>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          {draft.instagram_posts.length > 0 ? (
            <section>
              <h2 className="display text-[2.25rem]">Así se verían tus posteos</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {draft.instagram_posts.map((url, i) => (
                  <InstagramEmbed key={url} url={url} title={`Publicación ${i + 1} de ${draft.full_name} en Instagram`} />
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border p-6">
              <h2 className="display text-[1.75rem]">Tu historia va acá</h2>
              <p className="mt-2 text-muted-foreground">
                Después de reclamarla sumás tu foto, tu historia, tus logros y hasta 6 posteos de Instagram.
              </p>
            </section>
          )}
          <section>
            <h2 className="display text-[2.25rem]">Qué pasa cuando la reclamás</h2>
            <ol className="mt-4 divide-y divide-border border-y border-border">
              <Step title="Entrás con tu email" detail="Sin contraseña ni DNI: te mandamos un link." />
              <Step title="Confirmás tus datos" detail="Nombre, deporte, provincia y fecha de nacimiento." />
              <Step title="La revisamos y se publica" detail="Después sumás tu alias, tu rifa o una campaña cuando quieras." />
            </ol>
          </section>
        </div>

        {/* First on phones: claiming is the one action this page exists for. */}
        <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
          <ClaimPanel token={token} draft={draft} />
        </aside>
      </div>
    </div>
  );
}

function Step({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="py-4">
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground">{detail}</p>
    </li>
  );
}
