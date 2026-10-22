import { toast } from 'sonner'

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error'

/**
 * Toast con título + detalle, igual que en la intranet:
 *   notify('error', 'No se pudo guardar', 'Revisá la conexión')
 * `id` reemplaza un toast anterior con el mismo id.
 */
export function notify(severity: ToastSeverity, titulo: string, detalle?: string, duracion?: number, id?: string) {
  const opts = { description: detalle, duration: duracion, id }
  switch (severity) {
    case 'success':
      return toast.success(titulo, opts)
    case 'info':
      return toast.info(titulo, opts)
    case 'warn':
      return toast.warning(titulo, opts)
    case 'error':
      return toast.error(titulo, opts)
  }
}
