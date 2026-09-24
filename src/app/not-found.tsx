import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-32 text-center sm:px-6">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">
        Error 404
      </p>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
        No encontramos esta página
      </h1>

      <p className="mx-auto mt-4 max-w-md text-muted">
        Puede que el enlace esté mal escrito o que el producto ya no esté
        disponible.
      </p>

      <Link
        href="/productos"
        className="mt-10 inline-flex items-center rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
      >
        Ver productos
      </Link>
    </section>
  );
}
