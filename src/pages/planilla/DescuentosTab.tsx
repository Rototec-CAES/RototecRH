import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">Préstamos y embargos</p>
          <p className="text-xs text-muted-foreground">
            La cuota se descuenta sola en cada planilla generada y el saldo baja al cerrarla. Anticipos y
            otros descuentos puntuales se capturan directo en la planilla.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={soloActivos} onCheckedChange={(v) => setSoloActivos(v === true)} />
            Solo activos
          </label>
          <Button onClick={() => setNuevo(true)}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data?.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay préstamos ni embargos registrados.</p>
        ) : (
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Monto total</TableHead>
                <TableHead className="text-right">Cuota quincenal</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="font-medium">{d.empleado}</p>
                    <p className="text-[10px] text-muted-foreground">{d.codigo}</p>
                  </TableCell>
                  <TableCell>{TIPO_LABEL[d.tipo]}</TableCell>
                  <TableCell>{d.descripcion ?? '—'}</TableCell>
                  <TableCell>{formatDate(d.fechaInicio)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.montoTotal === null ? 'Indefinido' : formatQ(d.montoTotal)}
                  </TableCell>
                  <TableCell className="w-28 text-right">
                    <EditableCell
                      initial={d.cuota}
                      onCommit={(n) => (n > 0 ? onActualizar(d, { cuota: n }) : toast.error('La cuota debe ser mayor a 0'))}
                      disabled={!d.activo}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.saldo === null ? '—' : formatQ(d.saldo)}</TableCell>
                  <TableCell>
                    <Badge variant={d.activo ? 'success' : 'secondary'}>{d.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onActualizar(d, { activo: !d.activo })}>
                      {d.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo préstamo o embargo</DialogTitle>
          <DialogDescription>Se descuenta desde la primera planilla cuya quincena termine después de la fecha de inicio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Colaborador</Label>
            <EmpleadoCombobox empleados={opciones} value={idEmpleado} onChange={setIdEmpleado} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
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
              <Label className="text-xs">Fecha de inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monto total (vacío = indefinido)</Label>
              <Input type="number" min={0} step="0.01" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cuota por quincena</Label>
              <Input type="number" min={0} step="0.01" value={cuota} onChange={(e) => setCuota(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Input value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={crear.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
