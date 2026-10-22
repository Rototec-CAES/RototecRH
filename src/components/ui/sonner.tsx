import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Toaster como el de la intranet: colores por tipo (richColors), arriba a la derecha y con
 * botón de cerrar. No se pisan los fondos para que éxito/error/aviso se distingan a simple vista.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast font-sans shadow-lg',
          title: 'font-semibold',
          description: 'opacity-90',
          actionButton: 'group-[.toast]:bg-sky-500 group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600',
        },
      }}
      {...props}
    />
  )
}

export { toast } from 'sonner'
