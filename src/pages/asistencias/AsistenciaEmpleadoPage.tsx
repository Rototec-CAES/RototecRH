import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useVerificacionAsistencias } from '@/hooks/useAsistencias'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreEmpleado } from '@/lib/utils'
import type { EmpleadoBackend } from '@/types'
import { VerificacionResumen, VerificacionTable } from '@/components/asistencias/verificacion'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Detalle de asistencia de UN empleado. Es de solo lectura a propósito: la fuente es el biométrico
 * y la corrección de un día se hace registrando la ausencia que corresponda, no editando la marca.
 */
export default function AsistenciaEmpleadoPage() {
  const { id } = useParams<{ id: string }>()
  const idEmpleado = Number(id)

  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosBackendList()
  const verifQ = useVerificacionAsistencias(rango.desde, rango.hasta)

  const empleado = useMemo(
    () => ((empleados ?? []) as EmpleadoBackend[]).find((e) => e.id === idEmpleado),
    [empleados, idEmpleado],
  )

  const filas = useMemo(() => {
    return (verifQ.data ?? [])
      .filter((v) => v.idEmpleado === idEmpleado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [verifQ.data, idEmpleado])

  const years = [year - 1, year, year + 1]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/asistencias">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {empleado ? nombreEmpleado(empleado) : `Empleado #${idEmpleado}`}
          </h1>
          <p className="text-xs text-muted-foreground">
            Asistencia día a día. Para corregir un día,{' '}
            <Link to="/ausencias" className="underline">registra la ausencia</Link> correspondiente.
          </p>
        </div>
      </div>

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
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="tabular-nums">{formatDate(rango.desde)} – {formatDate(rango.hasta)}</span>
          </div>
        </div>
      </Card>

      <VerificacionResumen rows={filas} />

      <VerificacionTable
        rows={filas}
        isLoading={verifQ.isLoading}
        mostrarEmpleado={false}
        emptyText="Sin registros de asistencia en el período"
      />
    </div>
  )
}
