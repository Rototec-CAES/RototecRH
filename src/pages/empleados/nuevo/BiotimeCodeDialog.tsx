import { useState } from 'react'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface AltaResumen {
  id: number
  nombre: string
  puesto: string
  departamento: string
  codigoBiotime: string
}

export function BiotimeCodeDialog({
  resumen,
  onClose,
}: {
  resumen: AltaResumen | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const open = resumen != null

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumen.codigoBiotime)
      setCopied(true)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar; cópialo manualmente')
    }
  }

  function handleClose() {
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && copied) handleClose() }}>
      <DialogContent
        onEscapeKeyDown={(e) => { if (!copied) e.preventDefault() }}
        onInteractOutside={(e) => { if (!copied) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (!copied) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon icon="solar:user-check-bold" width={18} />
            </span>
            Empleado creado
          </DialogTitle>
          <DialogDescription>
            Copia el código de Biotime para registrarlo en el biométrico. Es obligatorio copiarlo para cerrar.
          </DialogDescription>
        </DialogHeader>

        {resumen && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-medium tabular-nums">{resumen.id}</dd>
              <dt className="text-slate-500">Nombre</dt>
              <dd className="font-medium">{resumen.nombre}</dd>
              <dt className="text-slate-500">Puesto</dt>
              <dd className="font-medium">{resumen.puesto}</dd>
              <dt className="text-slate-500">Departamento</dt>
              <dd className="font-medium">{resumen.departamento}</dd>
            </dl>

            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 p-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Código Biotime</div>
                <div className="truncate font-mono text-3xl font-bold tracking-wider text-slate-900">{resumen.codigoBiotime}</div>
              </div>
              <Button type="button" variant={copied ? 'outline' : 'default'} onClick={copiar} className="shrink-0">
                <Icon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} />
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} disabled={!copied}>
            {copied ? 'Cerrar' : 'Copia el código para cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
