/**
 * Armado de HTML para emails.
 *
 * Los clientes de correo entienden un subconjunto viejo de HTML: tablas para
 * maquetar, estilos en línea, nada de flexbox ni hojas de estilo externas. Por
 * eso el markup de acá no se parece al del sitio.
 */

/**
 * Escapa texto para insertarlo en HTML.
 *
 * Obligatorio para todo lo que venga del formulario — nombre, dirección, notas.
 * Sin esto, un comprador podría inyectar markup en el email que recibe el dueño.
 */
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const INK = "#111111";
const MUTED = "#6b6b6b";
const LINE = "#e5e3df";

/** Envuelve el contenido en la estructura común a todos los emails. */
export function layout({
  titulo,
  storeName,
  contenido,
  pie,
}: {
  titulo: string;
  storeName: string;
  contenido: string;
  pie?: string;
}): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f5f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f5f3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${LINE};">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${LINE};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;letter-spacing:0.5px;color:${INK};text-transform:uppercase;">
                ${escapar(storeName)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
              ${contenido}
            </td>
          </tr>
          ${
            pie
              ? `<tr>
            <td style="padding:20px 32px;border-top:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">
              ${pie}
            </td>
          </tr>`
              : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function titulo(texto: string): string {
  return `<h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:${INK};">${escapar(texto)}</h1>`;
}

export function parrafo(html: string): string {
  return `<p style="margin:0 0 16px;color:${INK};">${html}</p>`;
}

export function apagado(html: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:${MUTED};">${html}</p>`;
}

/** Bloque destacado, para los datos de pago o el estado del pedido. */
export function recuadro(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f6f5f3;border:1px solid ${LINE};">
    <tr><td style="padding:16px 20px;font-size:14px;line-height:1.7;color:${INK};">${html}</td></tr>
  </table>`;
}

export function boton(href: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="background-color:${INK};">
        <a href="${escapar(href)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">${escapar(texto)}</a>
      </td>
    </tr>
  </table>`;
}

export type FilaDetalle = {
  producto: string;
  variante: string | null;
  cantidad: number;
  importe: string;
};

/** Tabla con el detalle del pedido y sus totales. */
export function detalle(
  filas: FilaDetalle[],
  totales: { etiqueta: string; valor: string; fuerte?: boolean }[],
): string {
  const cuerpo = filas
    .map(
      (f) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">
        ${escapar(f.producto)}${f.variante ? `<br><span style="font-size:12px;color:${MUTED};">${escapar(f.variante)}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${MUTED};text-align:center;white-space:nowrap;">
        ×${f.cantidad}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};text-align:right;white-space:nowrap;">
        ${escapar(f.importe)}
      </td>
    </tr>`,
    )
    .join("");

  const pie = totales
    .map(
      (t) => `<tr>
      <td colspan="2" style="padding:${t.fuerte ? "12px 0 0" : "8px 0 0"};font-size:${t.fuerte ? "16px" : "14px"};${t.fuerte ? "font-weight:bold;" : ""}color:${t.fuerte ? INK : MUTED};">
        ${escapar(t.etiqueta)}
      </td>
      <td style="padding:${t.fuerte ? "12px 0 0" : "8px 0 0"};font-size:${t.fuerte ? "16px" : "14px"};${t.fuerte ? "font-weight:bold;" : ""}color:${INK};text-align:right;white-space:nowrap;">
        ${escapar(t.valor)}
      </td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    ${cuerpo}${pie}
  </table>`;
}
