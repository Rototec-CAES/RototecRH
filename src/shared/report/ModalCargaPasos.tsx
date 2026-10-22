/**
 * Modal de espera con pasos para cargas largas. El backend responde en una sola
 * request, así que los pasos avanzan por tiempo estimado (`ms` de cada uno); el
 * último queda activo hasta que termina la carga y entonces todos se marcan completos.
 */
import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface PasoCarga {
  texto: string
  /** Duración estimada; se ignora en el último paso. */
  ms: number
}

interface Props {
  cargando: boolean
  pasos: PasoCarga[]
  titulo: string
  tituloListo: string
  icono: string
  subtitulo?: string
  testId?: string
}

/** Pasado este tiempo se avisa que la consulta puede demorar. */
const AVISO_LENTO_MS = 15000

function pasoActual(pasos: PasoCarga[], ms: number) {
  let acumulado = 0
  for (let i = 0; i < pasos.length - 1; i++) {
    acumulado += pasos[i].ms
    if (ms < acumulado) return i
  }
  return pasos.length - 1
}

export function ModalCargaPasos({ cargando, pasos, titulo, tituloListo, icono, subtitulo, testId }: Props) {
  const [visible, setVisible] = useState(false)
  const [terminado, setTerminado] = useState(false)
  const [ms, setMs] = useState(0)

  useEffect(() => {
    if (!cargando) return
    setVisible(true)
    setTerminado(false)
    setMs(0)
    const inicio = Date.now()
    const id = setInterval(() => setMs(Date.now() - inicio), 100)
    return () => clearInterval(id)
  }, [cargando])

  /* Al terminar se muestran todos los pasos completos un momento antes de cerrar. */
  useEffect(() => {
    if (cargando || !visible) return
    setTerminado(true)
    const id = setTimeout(() => setVisible(false), 700)
    return () => clearTimeout(id)
  }, [cargando, visible])

  const paso = terminado ? pasos.length : pasoActual(pasos, ms)
  const progreso = terminado ? 100 : Math.min(95, 95 * (1 - Math.exp(-ms / 5000)))

  return (
    <Dialog open={visible}>
      <DialogContent
        hideClose
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        data-testid={testId}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50">
            {!terminado && <span className="absolute inset-0 animate-ping rounded-2xl bg-cyan-200/50" />}
            <Icon
              icon={terminado ? 'solar:check-circle-bold' : icono}
              width={26}
              className={terminado ? 'text-emerald-500' : 'text-cyan-600'}
            />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-slate-800">{terminado ? tituloListo : titulo}</DialogTitle>
            {subtitulo && <DialogDescription className="text-xs text-slate-500">{subtitulo}</DialogDescription>}
          </div>
        </div>

        <div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                terminado ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-teal-500',
              )}
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{Math.round(progreso)}%</span>
            <span>{(ms / 1000).toFixed(1)} s</span>
          </div>
        </div>

        <ol className="space-y-2.5">
          {pasos.map((p, i) => {
            const hecho = i < paso
            const activo = i === paso
            return (
              <li key={p.texto} className="flex items-center gap-3 text-sm">
                {hecho ? (
                  <Icon icon="solar:check-circle-bold" width={18} className="shrink-0 text-emerald-500" />
                ) : activo ? (
                  <Icon icon="svg-spinners:180-ring" width={18} className="shrink-0 text-cyan-600" />
                ) : (
                  <span className="mx-[3px] h-3 w-3 shrink-0 rounded-full border-2 border-slate-200" />
                )}
                <span
                  className={cn(
                    'transition-colors',
                    hecho && 'text-slate-500',
                    activo && 'font-semibold text-slate-800',
                    !hecho && !activo && 'text-slate-300',
                  )}
                >
                  {p.texto}
                </span>
              </li>
            )
          })}
        </ol>

        {!terminado && ms > AVISO_LENTO_MS && (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Icon icon="solar:clock-circle-bold" width={14} className="shrink-0" />
            Está tardando más de lo normal; la consulta puede demorar unos segundos más.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
