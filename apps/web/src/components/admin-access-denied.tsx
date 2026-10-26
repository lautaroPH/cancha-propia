export function AdminAccessDenied({ email }: { email: string }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="text-[2.25rem]">No tenés acceso de administrador</h1>
      <p className="mt-3 text-muted-foreground">
        Esta cuenta ({email}) no está habilitada como admin. Pedile a alguien con acceso que te
        agregue.
      </p>
    </div>
  );
}
