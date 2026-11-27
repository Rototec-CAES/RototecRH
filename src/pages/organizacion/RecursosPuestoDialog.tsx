import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { extractApiErrorMessage } from '@/api/client'
import type { PuestoNodo, RecursoCatalogo, TipoRecurso } from '@/api/estructura'
import { useCatalogoRecursos, useCrearRecursoCatalogo, useGuardarRecursosPuesto } from '@/hooks/useEstructura'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

const TID = 'rh-organizacion-recursos'

// Íconos literales para que el empaquetador de íconos (scripts/generar-iconos.mjs) los incluya:
// el nombre del ícono viene de la BD, así que tiene que estar en esta lista para verse sin internet.
export const ICONOS_RECURSO = [
  'solar:laptop-bold',
  'solar:monitor-bold',
  'solar:tablet-bold',
  'solar:smartphone-bold',
  'solar:phone-bold',
  'solar:radio-bold',
  'solar:printer-bold',
  'solar:bus-bold',
  'solar:keyboard-bold',
  'solar:mouse-bold',
  'solar:headphones-round-bold',
  'solar:camera-bold',
  'solar:wi-fi-router-bold',
  'solar:usb-bold',
  'solar:card-bold',
  'solar:key-bold',
  'solar:global-bold',
  'solar:cart-large-bold',
  'solar:letter-bold',
  'solar:database-bold',
  'solar:ticket-bold',
  'solar:shield-network-bold',
  'solar:server-bold',
  'solar:cloud-bold',
  'solar:chat-round-bold',
  'solar:user-id-bold',
  'solar:lock-keyhole-bold',
  'solar:code-bold',
  'solar:chart-bold',
  'solar:document-text-bold',
  'solar:widget-bold',
] as const

export const ICONO_DEFAULT: Record<TipoRecurso, string> = {
  EQUIPO: 'solar:box-bold',
  ACCESO: 'solar:key-bold',
}

const SECCION: Record<TipoRecurso, { titulo: string; ayuda: string; icono: string; placeholder: string }> = {
  EQUIPO: {
    titulo: 'Equipos',
    ayuda: 'Lo que la persona en este puesto necesita físicamente.',
    icono: 'solar:laptop-bold',
    placeholder: 'Otro equipo, p. ej. Escáner',
  },
  ACCESO: {
    titulo: 'Accesos',
    ayuda: 'Sistemas a los que debe tener usuario.',
    icono: 'solar:key-bold',
    placeholder: 'Otro acceso, p. ej. App de bodega',
  },
}

interface Props {
  puesto: PuestoNodo | null
  /** Sin permiso de editar Organización: solo ver lo configurado. */
  soloLectura?: boolean
  onOpenChange: (open: boolean) => void
}

export function RecursosPuestoDialog({ puesto, soloLectura = false, onOpenChange }: Props) {
  const open = puesto != null
  const { data: catalogo, isLoading } = useCatalogoRecursos(open)
  const guardar = useGuardarRecursosPuesto()

  // idRecurso → cantidad (solo los seleccionados)
  const [sel, setSel] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    // `?? []`: un backend sin desplegar aún no manda `recursos` en el árbol.
    if (puesto) setSel(new Map((puesto.recursos ?? []).map((r) => [r.id, r.cantidad])))
  }, [puesto])

  const porTipo = useMemo(() => {
    const out: Record<TipoRecurso, RecursoCatalogo[]> = { EQUIPO: [], ACCESO: [] }
    for (const r of catalogo ?? []) out[r.tipo]?.push(r)
    return out
  }, [catalogo])

  function toggle(id: number) {
    setSel((prev) => {
      const next = new Map(prev)
      next.has(id) ? next.delete(id) : next.set(id, 1)
      return next
    })
  }

  function setCantidad(id: number, n: number) {
    setSel((prev) => new Map(prev).set(id, Math.min(99, Math.max(1, n))))
  }

  async function onGuardar() {
    if (!puesto) return
    try {
      await guardar.mutateAsync({
        idPuesto: puesto.id,
        recursos: [...sel].map(([idRecurso, cantidad]) => ({ idRecurso, cantidad })),
      })
      notify('success', 'Configuración guardada')
      onOpenChange(false)
    } catch (err) {
      notify('error', 'No se pudo guardar', extractApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5 p-5" data-testid={`${TID}__dialog`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <Icon icon="solar:settings-bold" width={16} />
            </span>
            <span className="truncate">{puesto?.nombre}</span>
          </DialogTitle>
          <DialogDescription>
            Equipos y accesos que requiere el puesto. Es solo informativo; deja vacío si no aplica.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            {(['EQUIPO', 'ACCESO'] as const).map((tipo) => (
              <Seccion
                key={tipo}
                tipo={tipo}
                soloLectura={soloLectura}
                items={soloLectura ? porTipo[tipo].filter((r) => sel.has(r.id)) : porTipo[tipo]}
                sel={sel}
                onToggle={toggle}
                onCantidad={setCantidad}
                onCreado={(r) => setSel((prev) => new Map(prev).set(r.id, 1))}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!soloLectura && (
          <Button onClick={onGuardar} disabled={guardar.isPending || isLoading} data-testid={`${TID}__btn-guardar`}>
            {guardar.isPending ? (
              <Icon icon="svg-spinners:180-ring" width={16} />
            ) : (
              <Icon icon="solar:diskette-bold" width={16} />
            )}
            Guardar
          </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Seccion({
  tipo,
  soloLectura,
  items,
  sel,
  onToggle,
  onCantidad,
  onCreado,
}: {
  tipo: TipoRecurso
  soloLectura: boolean
  items: RecursoCatalogo[]
  sel: Map<number, number>
  onToggle: (id: number) => void
  onCantidad: (id: number, n: number) => void
  onCreado: (r: RecursoCatalogo) => void
}) {
  const cfg = SECCION[tipo]
  const crear = useCrearRecursoCatalogo()
  const [nuevo, setNuevo] = useState('')
  const elegidos = items.filter((i) => sel.has(i.id)).length

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    try {
      const r = await crear.mutateAsync({ tipo, nombre, icono: ICONO_DEFAULT[tipo] })
      onCreado(r)
      setNuevo('')
    } catch (err) {
      notify('error', 'No se pudo agregar', extractApiErrorMessage(err))
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Icon icon={cfg.icono} width={15} className="text-slate-400" />
          {cfg.titulo}
          {elegidos > 0 && (
            <span className="rounded-full bg-violet-100 px-1.5 text-[11px] font-semibold text-violet-700 tabular-nums">
              {elegidos}
            </span>
          )}
        </h4>
        <span className="text-xs text-slate-400">{cfg.ayuda}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((r) => {
          const activo = sel.has(r.id)
          return (
            <div
              key={r.id}
              className={cn(
                'flex items-center rounded-lg ring-1 transition-colors',
                activo ? 'bg-violet-50 ring-violet-300' : 'bg-white ring-slate-200 hover:ring-slate-300',
              )}
            >
              <button
                type="button"
                onClick={() => !soloLectura && onToggle(r.id)}
                disabled={soloLectura}
                aria-pressed={activo}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium',
                  activo ? 'text-violet-700' : 'text-slate-600',
                )}
              >
                <Icon icon={r.icono || ICONO_DEFAULT[r.tipo]} width={14} />
                {r.nombre}
                {activo && <Icon icon="solar:check-circle-bold" width={13} />}
              </button>
              {activo && tipo === 'EQUIPO' && soloLectura && (sel.get(r.id) ?? 1) > 1 && (
                <span className="border-l border-violet-200 px-2 text-xs font-semibold tabular-nums text-violet-700">×{sel.get(r.id)}</span>
              )}
              {activo && tipo === 'EQUIPO' && !soloLectura && (
                <div className="flex items-center border-l border-violet-200 pr-1 text-violet-700">
                  <button
                    type="button"
                    onClick={() => onCantidad(r.id, (sel.get(r.id) ?? 1) - 1)}
                    className="grid h-6 w-5 place-items-center rounded hover:bg-violet-100"
                    aria-label={`Menos ${r.nombre}`}
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-xs font-semibold tabular-nums">{sel.get(r.id)}</span>
                  <button
                    type="button"
                    onClick={() => onCantidad(r.id, (sel.get(r.id) ?? 1) + 1)}
                    className="grid h-6 w-5 place-items-center rounded hover:bg-violet-100"
                    aria-label={`Más ${r.nombre}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {!items.length && (
          <span className="text-xs text-slate-400">{soloLectura ? 'Ninguno.' : 'Aún no hay opciones; agrega la primera.'}</span>
        )}
      </div>

      {!soloLectura && (
      <form
        className="mt-2 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          void agregar()
        }}
      >
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={cfg.placeholder}
          maxLength={100}
          className="h-8 text-xs"
          data-testid={`${TID}__nuevo-${tipo.toLowerCase()}`}
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0" disabled={!nuevo.trim() || crear.isPending}>
          <Icon icon="solar:add-circle-linear" width={14} />
          Agregar
        </Button>
      </form>
      )}
    </section>
  )
}
