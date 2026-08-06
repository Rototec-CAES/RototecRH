import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Eye, UserX } from 'lucide-react'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useNoMarcaron, useVerificacionAsistencias } from '@/hooks/useAsistencias'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { EmpleadoBackend } from '@/types'
import {
  TipoBadge,
  VerificacionResumen,
  VerificacionTable,
  tieneNovedad,
} from '@/components/asistencias/verificacion'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type Filtro = 'todos' | 'novedades'

export default function AsistenciasListPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>('TODOS')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosBackendList()
  const verifQ = useVerificacionAsistencias(rango.desde, rango.hasta)
  const noMarcaronQ = useNoMarcaron(rango.desde, rango.hasta)

  // El catálogo de empleados manda sobre el nombre que viene del biométrico.
  const nombrePorId = useMemo(() => {
    const m = new Map<number, string>()
    for (const e of (empleados ?? []) as EmpleadoBackend[]) m.set(e.id, nombreEmpleado(e))
    return m
  }, [empleados])

  const filas = useMemo(() => {
    let r = (verifQ.data ?? []).map((v) => ({ ...v, nombre: nombrePorId.get(v.idEmpleado) ?? v.nombre }))
    if (empleadoFiltro !== 'TODOS') r = r.filter((v) => String(v.idEmpleado) === empleadoFiltro)
    if (filtro === 'novedades') r = r.filter(tieneNovedad)
    return [...r].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre))
  }, [verifQ.data, nombrePorId, empleadoFiltro, filtro])

  const noMarcaron = useMemo(() => {
    let r = (noMarcaronQ.data ?? []).map((n) => ({
      ...n,
      nombre: nombrePorId.get(n.idEmpleado) ?? n.nombre,
    }))
    if (empleadoFiltro !== 'TODOS') r = r.filter((n) => String(n.idEmpleado) === empleadoFiltro)
    return r
  }, [noMarcaronQ.data, nombrePorId, empleadoFiltro])

  const empleadosActivos = useMemo(() => {
    return ((empleados ?? []) as EmpleadoBackend[])
      .filter((e) => e.estaActivo)
      .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [empleados])

  const years = [year - 1, year, year + 1]
  const conNovedad = useMemo(() => (verifQ.data ?? []).filter(tieneNovedad).length, [verifQ.data])

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

      <VerificacionResumen rows={verifQ.data ?? []} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={filtro === 'todos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('todos')}
          >
            Todos
          </Button>
          <Button
            variant={filtro === 'novedades' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro('novedades')}
          >
            Sólo novedades
            <span className="ml-2 rounded bg-background/20 px-1.5 text-xs">{conNovedad}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Las ausencias registradas mandan sobre el marcaje.{' '}
          <Link to="/ausencias" className="underline">Registrar una ausencia</Link>
        </p>
      </div>

      <VerificacionTable
        rows={filas}
        isLoading={verifQ.isLoading}
        emptyText={
          filtro === 'novedades'
            ? 'Sin novedades en el período'
            : 'Sin registros de asistencia en el período'
        }
      />

      {noMarcaron.length > 0 && (
        <Card>
          <div className="flex items-start gap-3 border-b p-4">
            <div className="rounded-md bg-rose-50 p-2">
              <UserX className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">No marcaron en todo el período</p>
              <p className="text-xs text-muted-foreground">
                Tenían turno programado y no registraron ni una marca. No tienen ausencia que lo
                explique: si corresponde, regístrala para que deje de aparecer aquí.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Días programados</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noMarcaron.map((n) => (
                <TableRow key={n.idEmpleado}>
                  <TableCell className="font-medium">{n.nombre}</TableCell>
                  <TableCell>{n.tipo ? <TipoBadge tipo={n.tipo} /> : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.diasProgramados}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/asistencias/${n.idEmpleado}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
