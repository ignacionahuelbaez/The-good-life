import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";

import { store } from "@/config/store";

/**
 * Envío de emails transaccionales.
 *
 * Sin `RESEND_API_KEY` no falla: escribe el email en la consola del servidor.
 * Eso permite desarrollar y probar el checkout completo sin cuenta de Resend ni
 * dominio verificado, y hace que el primer despliegue sea sólo cargar la clave.
 *
 * Nunca lanza. Un email que no sale no puede tumbar una venta ya confirmada: el
 * pedido queda igual en la base y el dueño lo ve en su panel.
 */

export type Email = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Guarda el email como archivo para poder abrirlo en el navegador.
 *
 * Sólo cuando no hay clave configurada. Permite revisar cómo quedó el email sin
 * mandarse correos de prueba a uno mismo. La carpeta `.emails/` está ignorada
 * por git.
 */
async function guardarParaInspeccion(email: Email): Promise<string | null> {
  try {
    const carpeta = join(process.cwd(), ".emails");
    await mkdir(carpeta, { recursive: true });

    const marca = new Date().toISOString().replace(/[:.]/g, "-");
    const destinatario = email.to.replace(/[^a-z0-9]/gi, "-");
    const archivo = join(carpeta, `${marca}-${destinatario}.html`);

    await writeFile(archivo, email.html, "utf8");
    return archivo;
  } catch {
    // Que no se pueda escribir el archivo no es motivo para romper nada.
    return null;
  }
}

export async function enviarEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${store.name} <onboarding@resend.dev>`;

  if (!apiKey) {
    const archivo = await guardarParaInspeccion(email);
    console.info(
      `\n[email no enviado: falta RESEND_API_KEY]` +
        `\n  para: ${email.to}` +
        `\n  asunto: ${email.subject}` +
        (archivo ? `\n  copia: ${archivo}` : "") +
        "\n",
    );
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    });

    if (error) {
      console.error(`[email] falló el envío a ${email.to}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[email] falló el envío a ${email.to}:`, error);
    return false;
  }
}
