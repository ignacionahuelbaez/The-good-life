"use client";

import * as Dialog from "@radix-ui/react-dialog";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Panel lateral.
 *
 * Construido sobre Radix Dialog en lugar de a mano: un panel modal tiene que
 * atrapar el foco, cerrarse con Escape, devolver el foco al abrirlo y anunciarse
 * a los lectores de pantalla. Eso es fácil de hacer mal y Radix ya lo resolvió.
 * Los estilos son propios, con los tokens del proyecto.
 */

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  children,
  footer,
  className,
}: {
  /** Obligatorio: es el nombre que anuncia el lector de pantalla al abrir. */
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />

      <Dialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-canvas shadow-xl",
          "data-[state=open]:animate-[slide-in_200ms_ease-out]",
          className,
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <Dialog.Title className="text-sm font-medium tracking-wide text-ink uppercase">
            {title}
          </Dialog.Title>

          <Dialog.Close
            className="-mr-2 p-2 text-muted transition-colors hover:text-ink"
            aria-label="Cerrar"
          >
            <CloseIcon className="size-5" />
          </Dialog.Close>
        </header>

        {description ? (
          <Dialog.Description className="sr-only">
            {description}
          </Dialog.Description>
        ) : (
          // Radix avisa por consola si el diálogo no describe su contenido.
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <footer className="border-t border-line px-5 py-4">{footer}</footer>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
