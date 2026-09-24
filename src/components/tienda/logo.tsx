/**
 * Wordmark de la marca.
 *
 * Recreación tipográfica de "The Good Life", no el isologo real: el archivo
 * `src/config/Logo(The good life).JPG` es temporal (fondo crema sólido, sin
 * transparencia) y no está pensado para durar. Este componente es el único
 * lugar del sitio que dibuja el nombre como marca — header y pie lo usan en
 * vez de imprimir `store.name` suelto — así que cuando exista un PNG/SVG
 * definitivo alcanza con reemplazar el contenido de acá por un <Image>, sin
 * tocar quien lo llama.
 *
 * La forma imita al logo real: "THE GOOD" en mayúscula y peso fuerte, "life"
 * en minúscula y peso liviano, con un punto final en el color de marca.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 font-extrabold tracking-tight text-ink uppercase ${className}`}
    >
      The Good
      <span className="text-[0.65em] font-normal lowercase tracking-normal text-muted">
        life
      </span>
      <span aria-hidden className="text-brand">
        .
      </span>
    </span>
  );
}
