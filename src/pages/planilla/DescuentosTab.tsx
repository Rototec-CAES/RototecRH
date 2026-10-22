import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/DataTable'
import { TableResultCount } from '@/components/shared/TableToolbar'
import { Panel, Tag } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import {
  useActualizarDescuentoEmpleado,
  useCrearDescuentoEmpleado,
  useDescuentosEmpleado,
} from '@/hooks/useNomina'
import { formatDate, formatQ } from '@/lib/utils'
import type { EmpleadoBackend } from '@/types'
import type { DescuentoEmpleado, TipoDescuento } from '@/types/nomina'
import { EditableCell } from './EditableCell'

const TID = 'rh-planilla-descuentos'

function nombreEmpleado(e: EmpleadoBackend): string {
  const apellidos = [e.primerApellido, e.segundoApellido, e.apellidoCasada].filter(Boolean).join(' ') || (e.apellido ?? '')
  const nombres = [e.primerNombre, e.segundoNombre, e.tercerNombre].filter(Boolean).join(' ') || (e.nombre ?? '')
  return [apellidos, nombres].filter((x) => x.trim()).join(', ') || `Empleado ${e.id}`
}

const TIPO_LABEL: Record<TipoDescuento, string> = { PRESTAMO: 'Préstamo', EMBARGO: 'Embargo' }

// Préstamos y embargos con cuota: cada planilla descuenta la cuota (o el saldo si es menor) y al
// cerrarla el saldo baja; cuando llega a 0 el descuento se desactiva solo.
export function DescuentosTab({ empresaId }: { empresaId: number }) {
  const [soloActivos, setSoloActivos] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const { data, isLoading } = useDescuentosEmpleado({ empresaId, activos: soloActivos })
  const actualizar = useActualizarDescuentoEmpleado()

  function onActualizar(d: DescuentoEmpleado, parche: Parameters<typeof actualizar.mutate>[0]['parche']) {
    actualizar.mutate(
      { id: d.id, parche },
      { onError: (err) => toast.error(extractApiErrorMessage(err)) },
    )
  }

  return (
    <div className="space-y-4">
      <Panel
        flush
        icon="solar:hand-money-bold"
        title="Préstamos y embargos"
        subtitle="La cuota se descuenta sola en cada planilla generada y el saldo baja al cerrarla. Anticipos y otros descuentos puntuales se capturan directo en la planilla."
        right={
          <div className="flex flex-wrap items-center gap-3">
            {data && <TableResultCount total={data.length} label="registro" />}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={soloActivos}
                onCheckedChange={(v) => setSoloActivos(v === true)}
                data-testid={`${TID}__filtro-activos`}
              />
              Solo activos
            </label>
            <Button onClick={() => setNuevo(true)} data-testid={`${TID}__btn-nuevo`}>
              <Icon icon="solar:add-circle-bold" width={16} />
              Nuevo
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon="solar:hand-money-bold"
            title="No hay préstamos ni embargos registrados"
            description="Usa el botón «Nuevo» para registrar uno."
          />
        ) : (
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Monto total</TableHead>
                <TableHead className="text-right">Cuota por planilla</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-800">{d.empleado}</p>
                    <p className="text-[10px] text-slate-500">{d.codigo}</p>
                  </TableCell>
                  <TableCell>
                    <Tag value={TIPO_LABEL[d.tipo]} severity={d.tipo === 'EMBARGO' ? 'danger' : 'info'} />
                  </TableCell>
                  <TableCell>{d.descripcion ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.fechaInicio)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.montoTotal === null ? <span className="text-slate-500">Indefinido</span> : formatQ(d.montoTotal)}
                  </TableCell>
                  <TableCell className="w-28 text-right">
                    <EditableCell
                      initial={d.cuota}
                      onCommit={(n) => (n > 0 ? onActualizar(d, { cuota: n }) : toast.error('La cuota debe ser mayor a 0'))}
                      disabled={!d.activo}
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                    {d.saldo === null ? '—' : formatQ(d.saldo)}
                  </TableCell>
                  <TableCell>
                    <Tag value={d.activo ? 'Activo' : 'Inactivo'} severity={d.activo ? 'success' : 'secondary'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onActualizar(d, { activo: !d.activo })}
                      className={d.activo ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}
                    >
                      <Icon icon={d.activo ? 'solar:pause-circle-linear' : 'solar:play-circle-linear'} width={15} />
                      {d.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <NuevoDescuentoDialog open={nuevo} onOpenChange={setNuevo} empresaId={empresaId} />
    </div>
  )
}

function NuevoDescuentoDialog({
  open,
  onOpenChange,
  empresaId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  empresaId: number
}) {
  const crear = useCrearDescuentoEmpleado()
  const { data: empleados } = useEmpleadosBackendList()
  const opciones = useMemo(
    () =>
      (empleados ?? [])
        .filter((e) => e.estaActivo && e.empresaId === empresaId)
        .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empleados, empresaId],
  )

  const [idEmpleado, setIdEmpleado] = useState<number | null>(null)
  const [tipo, setTipo] = useState<TipoDescuento>('PRESTAMO')
  const [descripcion, setDescripcion] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [cuota, setCuota] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10))

  function limpiar() {
    setIdEmpleado(null)
    setTipo('PRESTAMO')
    setDescripcion('')
    setMontoTotal('')
    setCuota('')
  }

  async function onGuardar() {
    const c = Number(cuota)
    const m = montoTotal.trim() ? Number(montoTotal) : null
    if (!idEmpleado) return toast.error('Selecciona el colaborador')
    if (!(c > 0)) return toast.error('La cuota debe ser mayor a 0')
    if (m !== null && !(m >= c)) return toast.error('El monto total debe ser mayor o igual a la cuota')
    try {
      await crear.mutateAsync({
        idEmpleado,
        tipo,
        descripcion: descripcion.trim() || undefined,
        montoTotal: m,
        cuota: c,
        fechaInicio,
      })
      toast.success(`${TIPO_LABEL[tipo]} registrado`)
      limpiar()
      onOpenChange(false)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  const lbl = 'text-xs font-semibold text-slate-600'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="solar:hand-money-bold" width={20} className="text-sky-500" />
            Nuevo préstamo o embargo
          </DialogTitle>
          <DialogDescription>Se descuenta en cada planilla (quincenal o mensual, según el colaborador) desde la primera cuyo período termine después de la fecha de inicio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className={lbl}>Colaborador</Label>
            <EmpleadoCombobox empleados={opciones} value={idEmpleado} onChange={setIdEmpleado} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={lbl}>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDescuento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESTAMO">Préstamo</SelectItem>
                  <SelectItem value="EMBARGO">Embargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className={lbl}>Fecha de inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className={lbl}>Monto total (vacío = indefinido)</Label>
              <Input type="number" min={0} step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className={lbl}>Cuota por planilla</Label>
              <Input type="number" min={0} step="0.01" value={cuota} onChange={(e) => setCuota(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className={lbl}>Descripción</Label>
            <Input value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={crear.isPending}>
            <Icon icon={crear.isPending ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={16} />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
