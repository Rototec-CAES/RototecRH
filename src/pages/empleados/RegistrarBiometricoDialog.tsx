import { useEffect, useState } from 'react'
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
import { NameCombobox } from '@/components/ui/name-combobox'
import { extractApiErrorMessage } from '@/api/client'
import { useBiotimeDepartamentos, useBiotimeUbicaciones } from '@/hooks/useBiotime'
import { useRegistrarBiometrico } from '@/hooks/useEmpleados'

export interface EmpleadoParaBiometrico {
  id: number
  nombre: string
}

/**
 * Registra en BioTime a UN empleado que no tiene código (p. ej. creado por la carga masiva).
 * Al terminar muestra el código y los pasos para enrolar la huella en el reloj.
 */
export function RegistrarBiometricoDialog({
  empleado,
  onClose,
}: {
  empleado: EmpleadoParaBiometrico | null
  onClose: () => void
}) {
  const bioDeptos = useBiotimeDepartamentos()
  const bioUbic = useBiotimeUbicaciones()
  const registrar = useRegistrarBiometrico()
  const [departamento, setDepartamento] = useState<number | null>(null)
  const [ubicacion, setUbicacion] = useState<number | null>(null)
  const [codigo, setCodigo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Cada vez que se abre para otro empleado, empieza limpio.
  useEffect(() => {
    setDepartamento(null)
    setUbicacion(null)
    setCodigo(null)
    setError(null)
    registrar.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado?.id])

  const open = empleado != null
  const enviando = registrar.isPending

  async function onRegistrar() {
    if (!empleado || !departamento || !ubicacion) return
    setError(null)
    try {
      const r = await registrar.mutateAsync({
        id: empleado.id,
        departamento_biotime: departamento,
        ubicacion_biometrico: ubicacion,
      })
      setCodigo(r.codigoEmpleadoBio)
      toast.success('Empleado registrado en el biométrico')
    } catch (err) {
      setError(extractApiErrorMessage(err))
    }
  }

  async function copiar() {
    if (codigo == null) return
    try {
      await navigator.clipboard.writeText(String(codigo))
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar; cópielo manualmente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="max-w-2xl overflow-y-visible" data-testid="rh-empleados__dialog-biometrico">
        {codigo == null ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Icon icon="solar:fingerprint-bold" width={18} />
                </span>
                Registrar en el biométrico
              </DialogTitle>
              <DialogDescription>
                <strong className="text-slate-700">{empleado?.nombre}</strong> todavía no está en BioTime, por eso no
                puede registrar su huella ni marcar asistencia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Departamento (biométrico) <span className="text-red-600">*</span>
                </span>
                <NameCombobox
                  options={bioDeptos.data ?? []}
                  value={departamento}
                  onChange={setDepartamento}
                  placeholder={bioDeptos.isLoading ? 'Cargando…' : 'Seleccione el departamento'}
                  searchPlaceholder="Buscar departamento…"
                  disabled={enviando}
                  multiline
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Ubicación / área (biométrico) <span className="text-red-600">*</span>
                </span>
                <NameCombobox
                  options={bioUbic.data ?? []}
                  value={ubicacion}
                  onChange={setUbicacion}
                  placeholder={bioUbic.isLoading ? 'Cargando…' : 'Seleccione la ubicación'}
                  searchPlaceholder="Buscar ubicación…"
                  disabled={enviando}
                  multiline
                />
                <p className="text-xs text-slate-500">
                  El área define en qué relojes aparecerá. Elija la del reloj donde va a registrar la huella.
                </p>
              </div>
              {error && (
                <p className="flex gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
                  <Icon icon="solar:danger-circle-bold" width={15} className="mt-px shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={enviando}>
                Cancelar
              </Button>
              <Button onClick={onRegistrar} disabled={enviando || !departamento || !ubicacion}>
                <Icon icon={enviando ? 'svg-spinners:180-ring' : 'solar:fingerprint-bold'} />
                {enviando ? 'Registrando…' : 'Registrar'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon icon="solar:check-circle-bold" width={18} />
                </span>
                Registrado en el biométrico
              </DialogTitle>
              <DialogDescription>
                {empleado?.nombre} ya está en BioTime. Ahora falta registrar su huella en el reloj.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 p-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Código BioTime</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900">{codigo}</div>
              </div>
              <Button variant="outline" onClick={copiar}>
                <Icon icon="solar:copy-linear" />
                Copiar
              </Button>
            </div>

            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>En el reloj: tecla <strong>M/OK</strong> → <strong>Usuarios</strong> → buscar este código.</li>
              <li>
                <strong>Editar</strong> → <strong>Huella</strong> → índice derecho (3 lecturas) y luego el índice
                izquierdo de respaldo.
              </li>
              <li>Probar un marcaje: debe mostrar el nombre y “¡Gracias!”.</li>
            </ol>

            <DialogFooter>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
