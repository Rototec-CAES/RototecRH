import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
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
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useAusenciasPeriodoBackend, useEliminarAusencia, useTiposAusencia } from '@/hooks/useAusenciasBackend'
import { useAuth } from '@/hooks/useAuth'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { AusenciaBackend, EmpleadoBackend } from '@/types'
import { AusenciaFormDialog } from './AusenciaFormDialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function diaSemanaCorto(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA[d.getDay()]
}

export default function AusenciasPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>('TODOS')
  const [ausenciaOpen, setAusenciaOpen] = useState(false)
  const [editando, setEditando] = useState<AusenciaBackend | null>(null)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { user } = useAuth()
  const puedeEliminarAusencia = user?.rol === 1
  const { data: empleados } = useEmpleadosBackendList()
  const tiposQ = useTiposAusencia()
  const ausenciasQ = useAusenciasPeriodoBackend(rango.desde, rango.hasta)

  const empById = useMemo(() => {
    const m = new Map<number, EmpleadoBackend>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const tipoNombreById = useMemo(() => {
    const m = new Map<number, string>()
    for (const t of tiposQ.data ?? []) m.set(t.id, t.nombre ?? `#${t.id}`)
    return m
  }, [tiposQ.data])

  const ausenciasFiltradas = useMemo(() => {
    const all = ausenciasQ.data ?? []
    const f = empleadoFiltro === 'TODOS' ? all : all.filter((a) => String(a.idEmpleado) === empleadoFiltro)
    return [...f].sort((a, b) => a.fechaAusencia.localeCompare(b.fechaAusencia))
  }, [ausenciasQ.data, empleadoFiltro])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estaActivo)
      .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [empleados])

  const years = [year - 1, year, year + 1]

  function abrirCrear() {
    setEditando(null)
    setAusenciaOpen(true)
  }
  function abrirEditar(a: AusenciaBackend) {
    setEditando(a)
    setAusenciaOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Año</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mes</label>
              <Select value={String(monthIndex)} onValueChange={(v) => setMonthIndex(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Quincena</label>
              <Select value={String(quincena)} onValueChange={(v) => setQuincena(Number(v) as Quincena)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª (1–15)</SelectItem>
                  <SelectItem value="2">2ª (16–fin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Empleado</label>
              <EmpleadoCombobox
                className="w-72"
                empleados={empleadosActivos}
                value={empleadoFiltro === 'TODOS' ? null : Number(empleadoFiltro)}
                onChange={(id) => setEmpleadoFiltro(id == null ? 'TODOS' : String(id))}
                allowAll
                allLabel="Todos"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="tabular-nums">{formatDate(rango.desde)} – {formatDate(rango.hasta)}</span>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              Ausencias
              <span className="ml-2 rounded bg-muted px-1.5 text-xs font-normal">
                {ausenciasFiltradas.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Atrasos, salidas tempranas y no-shows se revisan en{' '}
              <Link to="/asistencias" className="underline">Asistencias</Link>.
            </p>
          </div>
          <Button onClick={abrirCrear}><Plus className="h-4 w-4" />Registrar ausencia</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Constancia</TableHead>
                <TableHead className="text-right">Días desc.</TableHead>
                <TableHead>Séptimo</TableHead>
                <TableHead>IGSS</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ausenciasQ.isLoading ? (
                <SkeletonRows colSpan={9} />
              ) : ausenciasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Sin ausencias en el período
                  </TableCell>
                </TableRow>
              ) : (
                ausenciasFiltradas.map((a) => (
                  <AusenciaRow
                    key={a.id}
                    ausencia={a}
                    nombre={empById.get(a.idEmpleado) ? nombreEmpleado(empById.get(a.idEmpleado)!) : `#${a.idEmpleado}`}
                    tipoNombre={tipoNombreById.get(a.tipoAusencia) ?? `#${a.tipoAusencia}`}
                    onEdit={() => abrirEditar(a)}
                    puedeEliminar={puedeEliminarAusencia}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AusenciaFormDialog
        open={ausenciaOpen}
        onOpenChange={(o) => {
          setAusenciaOpen(o)
          if (!o) setEditando(null)
        }}
        ausencia={editando}
      />
    </div>
  )
}

function SkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function AusenciaRow({
  ausencia,
  nombre,
  tipoNombre,
  onEdit,
  puedeEliminar,
}: {
  ausencia: AusenciaBackend
  nombre: string
  tipoNombre: string
  onEdit: () => void
  puedeEliminar: boolean
}) {
  const eliminar = useEliminarAusencia()

  async function onDelete() {
    if (!confirm('¿Eliminar esta ausencia?')) return
    try {
      await eliminar.mutateAsync(ausencia.id)
      toast.success('Ausencia eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <TableRow>
      <TableCell className="tabular-nums">{formatDate(ausencia.fechaAusencia)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{diaSemanaCorto(ausencia.fechaAusencia)}</TableCell>
      <TableCell className="font-medium">{nombre}</TableCell>
      <TableCell>{tipoNombre}</TableCell>
      <TableCell>
        {ausencia.presentoConstancia ? (
          <Badge variant="success">Sí</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{ausencia.diasDescontados}</TableCell>
      <TableCell>
        {ausencia.descontarSeptimo ? (
          <Badge variant="warning">Sí</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {ausencia.pagaIGSS ? (
          <Badge variant="outline">IGSS paga</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        {puedeEliminar && (
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={eliminar.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
