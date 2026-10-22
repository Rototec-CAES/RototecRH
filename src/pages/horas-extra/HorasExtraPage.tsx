import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/DataTable'
import { TableResultCount, TableSearch } from '@/components/shared/TableToolbar'
import { ModalCargaPasos } from '@/shared/report/ModalCargaPasos'
import { FieldLabel, FilterCard, FilterRow, GuiaLectura, KpiCard, Panel } from '@/shared/report/report-ui'
import { usePreferenciaVisible } from '@/shared/report/report-utils'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import {
  useHorasExtra,
  useHorasExtraDesglose,
  useHorasExtraDetalle,
  useHorasExtraExcluidos,
} from '@/hooks/useHorasExtra'
import { horasExtraApi } from '@/api/horas-extra'
import { apellidosNombre, cn, formatCatorcena, formatRangoCorto } from '@/lib/utils'
import { exportarExcluidos, exportarHorasExtra } from '@/lib/exportHorasExtra'
import type { DesgloseSemanaHE, DetalleDiaHE, EmpleadoBackend, ExcluidoHE, FuenteTurno } from '@/types'

const TID = 'rh-horas-extra'

const PASOS_CARGA = [
  { texto: 'Leyendo turnos programados', ms: 1500 },
  { texto: 'Cruzando marcajes del biométrico', ms: 2500 },
  { texto: 'Aplicando ausencias registradas', ms: 1500 },
  { texto: 'Calculando horas extra por semana', ms: 0 },
]

const GUIA = [
  {
    titulo: 'Efectivas',
    texto: 'Horas reconocidas en la catorcena: turno programado validado contra el biométrico, menos 1 h de almuerzo por día.',
  },
  {
    titulo: 'Saldo',
    texto: 'Efectivas menos las ordinarias del sistema (44 h día / 36 h noche por semana, proporcional). En rojo: el colaborador debe horas.',
  },
  {
    titulo: 'HE diurnas / nocturnas',
    texto: 'Horas extra a pagar, separadas por jornada. Una semana con déficit aporta 0 y no se arrastra a la siguiente.',
  },
  {
    titulo: 'Excluidos',
    texto: 'Tenían turno programado en el rango y no registraron ninguna marca: no entran al cálculo.',
  },
]

interface Fila {
  idEmpleado: number
  nombre: string
  fuente?: FuenteTurno
  periodo: string
  dia: number
  noche: number
  horasEfectivas: number
  excedente: number
  sistemas: string[]
}

const FUENTE_META: Record<FuenteTurno, { label: string; icon: string; clase: string }> = {
  ACABADOS: { label: 'Acabados', icon: 'solar:box-bold', clase: 'bg-violet-100 text-violet-700' },
  MAQUINAS: { label: 'Máquinas', icon: 'solar:settings-bold', clase: 'bg-teal-100 text-teal-700' },
  PVC: { label: 'PVC', icon: 'solar:layers-bold', clase: 'bg-sky-100 text-sky-700' },
  GENERAL: { label: 'General', icon: 'solar:clock-circle-bold', clase: 'bg-indigo-100 text-indigo-700' },
}

// Etiqueta de la fuente del turno (de qué tabla viene el empleado).
function FuenteBadge({ fuente }: { fuente?: FuenteTurno }) {
  const meta = fuente ? FUENTE_META[fuente] : undefined
  if (!meta) return <span className="text-xs text-slate-400">—</span>
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', meta.clase)}>
      <Icon icon={meta.icon} width={12} /> {meta.label}
    </span>
  )
}

// Nombre "APELLIDOS - Nombres": apellidos en negrita, nombres tenues (formato de directorio).
function NombreCell({ nombre }: { nombre: string }) {
  const i = nombre.indexOf(' - ')
  if (i === -1) return <span className="font-medium text-slate-800">{nombre}</span>
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-slate-800">{nombre.slice(0, i)}</span>
      <span className="text-slate-500"> — {nombre.slice(i + 3)}</span>
    </span>
  )
}

// Control segmentado para filtrar por fuente (Todos / Acabados / Máquinas / PVC), con conteos.
function FuenteFilter({
  value,
  onChange,
  counts,
}: {
  value: 'TODAS' | FuenteTurno
  onChange: (v: 'TODAS' | FuenteTurno) => void
  counts: Record<'TODAS' | FuenteTurno, number>
}) {
  const opts: { key: 'TODAS' | FuenteTurno; label: string; dot?: string; active: string }[] = [
    { key: 'TODAS', label: 'Todos', active: 'bg-cyan-600 text-white' },
    { key: 'ACABADOS', label: 'Acabados', dot: 'bg-violet-500', active: 'bg-violet-600 text-white' },
    { key: 'MAQUINAS', label: 'Máquinas', dot: 'bg-teal-500', active: 'bg-teal-600 text-white' },
    { key: 'PVC', label: 'PVC', dot: 'bg-sky-500', active: 'bg-sky-600 text-white' },
    { key: 'GENERAL', label: 'General', dot: 'bg-indigo-500', active: 'bg-indigo-600 text-white' },
  ]
  return (
    <div data-testid={`${TID}__filtro-fuente`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {opts.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all',
              on ? `${o.active} shadow-sm` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {o.dot && <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-white' : o.dot)} />}
            {o.label}
            <span className={cn('tabular-nums', on ? 'opacity-90' : 'opacity-50')}>{counts[o.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

function hhDecimal(n: number): string {
  return n.toFixed(2)
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Primer día del mes en curso (YYYY-MM-DD, hora local). */
function primerDiaDelMes(): string {
  const n = new Date()
  return isoLocal(new Date(n.getFullYear(), n.getMonth(), 1))
}
/** Hoy (YYYY-MM-DD, hora local). */
function hoy(): string {
  return isoLocal(new Date())
}

export default function HorasExtraPage() {
  // Por defecto: del primer día del mes en curso hasta hoy.
  const [desde, setDesde] = useState(primerDiaDelMes)
  const [hasta, setHasta] = useState(hoy)
  const [texto, setTexto] = useState('')
  const [fuenteFiltro, setFuenteFiltro] = useState<'TODAS' | FuenteTurno>('TODAS')
  const [detalle, setDetalle] = useState<{ id: number; nombre: string } | null>(null)
  const [exportando, setExportando] = useState(false)
  const [guiaVisible, setGuiaVisible] = usePreferenciaVisible('rh-horas-extra.guia', true)

  const q = useHorasExtra(desde, hasta)
  // El modal de pasos solo acompaña la primera carga: la consulta corre sola en cada cambio de
  // fecha, y ahí basta con el skeleton de las tarjetas y la tabla.
  const [primeraCargaHecha, setPrimeraCargaHecha] = useState(false)
  useEffect(() => {
    if (!q.isLoading) setPrimeraCargaHecha(true)
  }, [q.isLoading])
  const { data: empleados } = useEmpleadosBackendList()

  const empById = useMemo(() => {
    const m = new Map<number, EmpleadoBackend>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = []
    for (const e of q.data ?? []) {
      for (const p of e.periodos) {
        // Mostrar quien tenga horas extra O un déficit (deben horas); ocultar lo neutro.
        if (p.dia <= 0 && p.noche <= 0 && p.excedente >= -0.005) continue
        const emp = empById.get(e.idEmpleado)
        const nombre = emp ? apellidosNombre(emp) : e.nombre || `#${e.idEmpleado}`
        out.push({ idEmpleado: e.idEmpleado, nombre, fuente: e.fuente, ...p })
      }
    }
    const t = texto.trim().toLowerCase()
    return out
      .filter((f) => fuenteFiltro === 'TODAS' || f.fuente === fuenteFiltro)
      .filter((f) => !t || f.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.periodo.localeCompare(b.periodo))
  }, [q.data, texto, fuenteFiltro, empById])

  // Conteo por fuente (sobre todo el universo con HE, sin aplicar el filtro de fuente) para las pestañas.
  const conteoFuente = useMemo(() => {
    const ids = { ACABADOS: new Set<number>(), MAQUINAS: new Set<number>(), PVC: new Set<number>(), GENERAL: new Set<number>() }
    for (const e of q.data ?? []) {
      const tieneHE = e.periodos.some((p) => p.dia > 0 || p.noche > 0 || p.excedente < -0.005)
      if (tieneHE && e.fuente) ids[e.fuente].add(e.idEmpleado)
    }
    return {
      ACABADOS: ids.ACABADOS.size,
      MAQUINAS: ids.MAQUINAS.size,
      PVC: ids.PVC.size,
      GENERAL: ids.GENERAL.size,
      TODAS: ids.ACABADOS.size + ids.MAQUINAS.size + ids.PVC.size + ids.GENERAL.size,
    }
  }, [q.data])

  const totalDia = filas.reduce((s, f) => s + f.dia, 0)
  const totalNoche = filas.reduce((s, f) => s + f.noche, 0)
  const empleadosConHE = new Set(filas.map((f) => f.idEmpleado)).size

  // Excluidos (programados que no marcaron), con el nombre resuelto desde el catálogo y ordenados.
  const exclQ = useHorasExtraExcluidos(desde, hasta)
  const excluidos = useMemo(() => {
    return (exclQ.data ?? [])
      .map((ex) => {
        const emp = empById.get(ex.idEmpleado)
        return { ...ex, nombre: emp ? apellidosNombre(emp) : ex.nombre || `#${ex.idEmpleado}` }
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [exclQ.data, empById])

  const onExportar = async () => {
    setExportando(true)
    try {
      // El detalle día a día de todos se trae al momento de exportar (consulta más pesada).
      const det = await horasExtraApi.detalleTodos(desde, hasta)
      const detalle = det.map((e) => {
        const emp = empById.get(e.idEmpleado)
        return {
          nombre: emp ? apellidosNombre(emp) : e.nombre || `#${e.idEmpleado}`,
          fuente: e.fuente,
          dias: e.dias,
        }
      })
      await exportarHorasExtra({ filas, excluidos, detalle, desde, hasta, fuente: fuenteFiltro })
    } finally {
      setExportando(false)
    }
  }
  const onExportarExcluidos = () => exportarExcluidos({ excluidos, desde, hasta })

  return (
    <div className="space-y-5">
      <ModalCargaPasos
        cargando={q.isLoading && !primeraCargaHecha}
        pasos={PASOS_CARGA}
        titulo="Calculando horas extra"
        tituloListo="Horas extra listas"
        icono="solar:clock-circle-bold"
        subtitulo={`${formatRangoCorto(desde, hasta)}`}
        testId={`${TID}__modal-carga`}
      />

      {/* Encabezado + filtros */}
      <FilterCard>
        <PageHeader
          titulo="Horas Extra"
          icono="solar:clock-circle-bold"
          descripcion="Cálculo por catorcena: la catorcena y sus 2 semanas arrancan en la fecha «Desde»."
        >
          {!guiaVisible && (
            <Button variant="outline" onClick={() => setGuiaVisible(true)} title="Mostrar la guía de lectura">
              <Icon icon="solar:book-2-bold" width={16} />
              Guía
            </Button>
          )}
          <Button
            onClick={onExportar}
            disabled={!filas.length || exportando}
            className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            title="Descargar Resumen + Detalle día a día + Excluidos en Excel"
            data-testid={`${TID}__btn-excel`}
          >
            <Icon icon={exportando ? 'svg-spinners:180-ring' : 'solar:file-download-linear'} width={16} />
            {exportando ? 'Generando…' : 'Exportar a Excel'}
          </Button>
        </PageHeader>

        <FilterRow>
          <div>
            <FieldLabel htmlFor={`${TID}-desde`}>Desde</FieldLabel>
            <Input
              id={`${TID}-desde`}
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-40"
              data-testid={`${TID}__filtro-desde`}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${TID}-hasta`}>Hasta</FieldLabel>
            <Input
              id={`${TID}-hasta`}
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-40"
              data-testid={`${TID}__filtro-hasta`}
            />
          </div>
          <div className="w-full sm:w-72">
            <FieldLabel>Empleado</FieldLabel>
            <TableSearch
              value={texto}
              onChange={setTexto}
              placeholder="Buscar por apellido o nombre…"
              testId={`${TID}__filtro-busqueda`}
            />
          </div>
          <div>
            <FieldLabel>Fuente del turno</FieldLabel>
            <FuenteFilter value={fuenteFiltro} onChange={setFuenteFiltro} counts={conteoFuente} />
          </div>
        </FilterRow>
      </FilterCard>

      <GuiaLectura
        visible={guiaVisible}
        onOcultar={() => setGuiaVisible(false)}
        items={GUIA}
        titulo="Cómo leer esta pantalla"
        testId={`${TID}__guia`}
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Empleados con HE"
          value={String(empleadosConHE)}
          accent="slate"
          icon="solar:users-group-rounded-bold"
          loading={q.isLoading}
          testId={`${TID}__kpi-empleados`}
        />
        <KpiCard
          label="HE diurnas (h)"
          value={hhDecimal(totalDia)}
          accent="amber"
          icon="solar:sun-bold"
          loading={q.isLoading}
          testId={`${TID}__kpi-diurnas`}
        />
        <KpiCard
          label="HE nocturnas (h)"
          value={hhDecimal(totalNoche)}
          accent="sky"
          icon="solar:moon-bold"
          loading={q.isLoading}
          testId={`${TID}__kpi-nocturnas`}
        />
      </section>

      {/* Detalle */}
      <Panel
        flush
        title="Detalle por empleado y catorcena"
        subtitle="Solo aparecen quienes tienen horas extra o deben horas. Usa el ojo para ver el cálculo día a día."
        right={<TableResultCount total={filas.length} label="fila" />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Catorcena</TableHead>
              <TableHead>Sistema(s)</TableHead>
              <TableHead className="text-right">Efectivas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">HE diurnas</TableHead>
              <TableHead className="text-right">HE nocturnas</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : q.isError ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState
                    icon="solar:danger-triangle-bold"
                    title="Error al calcular horas extra"
                    description="Revisa que el backend y los datos del rango existan."
                  />
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState title="Sin horas extra en el rango seleccionado" description="Prueba con otras fechas o quita los filtros." />
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f, i) => (
                <TableRow key={`${f.idEmpleado}-${f.periodo}`} className={cn(i % 2 === 1 && 'bg-slate-50/40')}>
                  <TableCell><NombreCell nombre={f.nombre} /></TableCell>
                  <TableCell><FuenteBadge fuente={f.fuente} /></TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                    {formatCatorcena(f.periodo)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{f.sistemas.join(' · ') || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{hhDecimal(f.horasEfectivas)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      f.excedente < -0.005
                        ? 'font-semibold text-rose-600'
                        : f.excedente > 0.005
                          ? 'text-emerald-600'
                          : 'text-slate-400',
                    )}
                  >
                    {hhDecimal(f.excedente)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.dia > 0 && 'font-semibold text-amber-600')}>
                    {hhDecimal(f.dia)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.noche > 0 && 'font-semibold text-sky-600')}>
                    {hhDecimal(f.noche)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ver detalle de días/sistema"
                      aria-label="Ver detalle"
                      onClick={() => setDetalle({ id: f.idEmpleado, nombre: f.nombre })}
                    >
                      <Icon icon="solar:eye-bold" width={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Panel>

      <ExcluidosCard excluidos={excluidos} isLoading={exclQ.isLoading} onExport={onExportarExcluidos} />

      <DetalleDialog
        desde={desde}
        hasta={hasta}
        empleado={detalle}
        onClose={() => setDetalle(null)}
      />
    </div>
  )
}

// Excluidos del cálculo: tienen turno programado en el rango pero no marcaron ("no vino").
function ExcluidosCard({
  excluidos,
  isLoading,
  onExport,
}: {
  excluidos: (ExcluidoHE & { nombre: string })[]
  isLoading: boolean
  onExport: () => void
}) {
  const [abierto, setAbierto] = useState(false)

  if (!isLoading && excluidos.length === 0) return null

  return (
    <Panel flush={abierto} className={abierto ? undefined : 'p-4'}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3', abierto && 'border-b border-slate-100 px-5 py-4')}>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex flex-wrap items-center gap-2 text-left text-sm font-semibold text-slate-900"
          data-testid={`${TID}__btn-excluidos`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50">
            <Icon icon="solar:user-cross-rounded-bold" width={16} className="text-rose-600" />
          </div>
          Excluidos del cálculo
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            {excluidos.length}
          </span>
          <span className="text-xs font-normal text-slate-500">programados que no marcaron (no vinieron)</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-500">
            {abierto ? 'Ocultar' : 'Ver lista'}
            <Icon icon={abierto ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={14} />
          </span>
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!excluidos.length}
          className="shrink-0"
          title="Descargar los excluidos en Excel"
        >
          <Icon icon="solar:file-download-linear" width={14} />
          Exportar
        </Button>
      </div>

      {abierto && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead className="text-right">Días programados</TableHead>
                <TableHead>Razón</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                excluidos.map((f) => (
                  <TableRow key={f.idEmpleado}>
                    <TableCell><NombreCell nombre={f.nombre} /></TableCell>
                    <TableCell>
                      <FuenteBadge fuente={f.fuente} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.diasProgramados}</TableCell>
                    <TableCell className="text-xs text-slate-500">No marcó (no vino)</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  )
}

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function diaSemana(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? '' : DIAS_SEM[d.getDay()]
}
function fmtHora(h: string): string {
  return h && h !== '00:00:00' ? h.slice(0, 5) : '—'
}
function fmt2(n: number): string {
  return n.toFixed(2)
}
/** Nº de días que cubre el periodo "AAAA-MM-DD..AAAA-MM-DD" (14 salvo la última catorcena cortada). */
function diasDelPeriodo(periodo: string): number {
  const [desde, hasta] = periodo.split('..')
  if (!desde || !hasta) return 0
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000) + 1
}
function rangoHoras(a: string | null, b: string | null): string {
  const ha = a ? fmtHora(a) : '—'
  const hb = b ? fmtHora(b) : '—'
  return ha === '—' && hb === '—' ? '—' : `${ha}–${hb}`
}
function fmtDuracion(min: number): string {
  const abs = Math.abs(Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
function fmtCumpl(n?: number | null, unidad?: 'puntos' | 'kg' | null): string {
  if (n == null) return '—'
  const v = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return `${v}${unidad === 'kg' ? ' kg' : unidad === 'puntos' ? ' pts' : ''}`
}

function Badge({ tone, children }: { tone: 'red' | 'amber' | 'green' | 'blue'; children: ReactNode }) {
  const tones = {
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-sky-100 text-sky-700',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

function EstadoDia({ dia, trabajado }: { dia: DetalleDiaHE; trabajado: boolean }) {
  // Ausencia registrada por RRHH: el horario del día lo decidió ella, no el reloj. Se muestra el
  // tipo y qué se le hizo al turno, sin las banderas del biométrico (el backend ya las apaga).
  if (dia.ausenciaEfecto === 'JORNADA_FIJA') {
    return (
      <Badge tone="blue">
        <Icon icon="solar:calendar-minimalistic-bold" width={12} /> {dia.ausenciaNombre ?? 'Ausencia justificada'} · jornada 08:00–17:00
      </Badge>
    )
  }
  if (dia.ausenciaEfecto === 'JORNADA_MEDIA') {
    return (
      <Badge tone="blue">
        <Icon icon="solar:calendar-minimalistic-bold" width={12} /> {dia.ausenciaNombre ?? 'Ausencia medio día'} · media jornada 08:00–13:00
      </Badge>
    )
  }
  if (dia.ausenciaEfecto === 'AUSENTE') {
    return (
      <Badge tone="red">
        <Icon icon="solar:calendar-minimalistic-bold" width={12} /> {dia.ausenciaNombre ?? 'Ausencia'} · sin horas
      </Badge>
    )
  }
  // Turno programado sin ninguna marca → no se presentó (no se infiere asistencia ni se pagan horas).
  if (dia.tipo === 'AUSENTE') {
    return (
      <Badge tone="red">
        <Icon icon="solar:danger-triangle-bold" width={12} /> No se presentó
      </Badge>
    )
  }
  const badges: ReactNode[] = []
  if (dia.faltaMarca)
    badges.push(
      <Badge key="fm" tone="red">
        <Icon icon="solar:danger-triangle-bold" width={12} /> Falta marca
      </Badge>,
    )
  if (dia.marcaSinTurno)
    badges.push(
      <Badge key="mst" tone="red">
        <Icon icon="solar:danger-triangle-bold" width={12} /> Marcó s/turno
      </Badge>,
    )
  if (dia.marcaFueraDeTurno)
    badges.push(
      <Badge key="mft" tone="red">
        <Icon icon="solar:danger-triangle-bold" width={12} /> Marca fuera de turno
      </Badge>,
    )
  if (dia.entradaTarde && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="et" tone="amber">
        <Icon icon="solar:clock-circle-bold" width={12} /> Entró {fmtDuracion(dia.entradaDeltaMin)} tarde
      </Badge>,
    )
  if (dia.entradaAntes && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="ea" tone="amber">
        <Icon icon="solar:clock-circle-bold" width={12} /> Entró {fmtDuracion(dia.entradaDeltaMin)} antes
      </Badge>,
    )
  if (dia.salidaTarde && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="st" tone="amber">
        <Icon icon="solar:clock-circle-bold" width={12} /> Salió {fmtDuracion(dia.salidaDeltaMin)} después
      </Badge>,
    )
  if (dia.salidaTemprano && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="se" tone="amber">
        <Icon icon="solar:clock-circle-bold" width={12} /> Salió {fmtDuracion(dia.salidaDeltaMin)} antes
      </Badge>,
    )
  if (dia.horarioAutorizado)
    badges.push(
      <Badge key="ha" tone="green">
        <Icon icon="solar:check-circle-bold" width={12} /> Horario autorizado
        {dia.cumplimientoPct != null ? ` · meta ${dia.cumplimientoPct.toFixed(2)}%` : ''}
      </Badge>,
    )
  if (badges.length === 0) {
    return trabajado ? (
      <Badge tone="green">
        <Icon icon="solar:check-circle-bold" width={12} /> OK
      </Badge>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>
}

function DetalleDialog({
  desde,
  hasta,
  empleado,
  onClose,
}: {
  desde: string
  hasta: string
  empleado: { id: number; nombre: string } | null
  onClose: () => void
}) {
  const desg = useHorasExtraDesglose(desde, hasta, empleado?.id ?? null)
  const det = useHorasExtraDetalle(desde, hasta, empleado?.id ?? null)

  const porPeriodo = useMemo(() => {
    const m = new Map<string, DesgloseSemanaHE[]>()
    for (const f of desg.data ?? []) {
      const arr = m.get(f.periodo) ?? []
      arr.push(f)
      m.set(f.periodo, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [desg.data])

  return (
    <Dialog open={!!empleado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(96vw,88rem)]">
        <DialogHeader>
          <DialogTitle>Detalle — {empleado?.nombre}</DialogTitle>
          <DialogDescription>
            Cálculo por semana de la catorcena ({desde} – {hasta})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-6 overflow-auto">
          {/* Desglose por semana (réplica del Resumen del Machote, cols H-W) */}
          {desg.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : porPeriodo.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos en el rango.</p>
          ) : (
            porPeriodo.map(([periodo, filas]) => {
              const heDia = filas.reduce((s, f) => s + f.saldoDia, 0)
              const heNoche = filas.reduce((s, f) => s + f.saldoNoche, 0)
              return (
                <div key={periodo} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {formatCatorcena(periodo)}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {diasDelPeriodo(periodo)} días
                        {diasDelPeriodo(periodo) < 14 && ' · catorcena incompleta'}
                      </span>
                    </h4>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                        HE diurnas {fmt2(heDia)}
                      </span>
                      <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">
                        HE nocturnas {fmt2(heNoche)}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        HE totales {fmt2(heDia + heNoche)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Semana</TableHead>
                          <TableHead className="whitespace-nowrap">Fechas</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Días</TableHead>
                          <TableHead className="whitespace-nowrap">Sistema</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Efectivas</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ordinarias</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Excedente</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. noche</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo noche</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filas.map((f) => (
                          <TableRow key={`${f.periodo}#${f.semana}`}>
                            <TableCell className="tabular-nums">{f.semana}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                              {formatRangoCorto(f.desde, f.hasta)}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                f.tipoSemana === 'parcial' ? 'font-medium text-amber-600' : 'text-muted-foreground',
                              )}
                              title={f.tipoSemana === 'parcial' ? 'Semana incompleta: ordinarias prorrateadas' : undefined}
                            >
                              {f.diasEnSemana}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">{f.sistema}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.horasEfectivas)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.ordinariasTotal)}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                f.excedente > 0.005 ? 'font-medium text-emerald-600' : 'text-muted-foreground',
                              )}
                            >
                              {fmt2(f.excedente)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propDia)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propNoche)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoDia > 0.005 && 'font-medium text-amber-600')}>
                              {fmt2(f.saldoDia)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoNoche > 0.005 && 'font-medium text-sky-600')}>
                              {fmt2(f.saldoNoche)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Horas extra finales = suma de saldos (sin multiplicador, sin neteo) */}
                        <TableRow className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-50">
                          <TableCell colSpan={9} className="text-right">
                            Horas extra finales · total {fmt2(heDia + heNoche)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-700">{fmt2(heDia)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sky-700">{fmt2(heNoche)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })
          )}

          {/* Detalle día a día (qué día trabajó qué sistema) */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Detalle día a día</h4>
            <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead className="text-center">Programado</TableHead>
                    <TableHead className="text-center">Biométrico</TableHead>
                    <TableHead className="text-center">Oficial</TableHead>
                    <TableHead className="text-right">Efectivas</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Ejecutado</TableHead>
                    <TableHead className="text-right">% Cumpl.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {det.isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={12}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !det.data || det.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                        Sin datos en el rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    det.data.map((d) => {
                      const trabajado = d.tipo === 'DIA' || d.tipo === 'NOCHE'
                      const grave = d.faltaMarca || d.marcaSinTurno || d.marcaFueraDeTurno || d.tipo === 'AUSENTE'
                      const leve = d.inconsistente && !grave
                      return (
                        <TableRow
                          key={d.fecha}
                          className={cn(
                            !trabajado && 'text-muted-foreground',
                            grave && 'bg-rose-50',
                            !grave && leve && 'bg-amber-50',
                          )}
                        >
                          <TableCell className="tabular-nums">{d.fecha}</TableCell>
                          <TableCell className="text-xs">{diaSemana(d.fecha)}</TableCell>
                          <TableCell className="text-xs">{d.tipo}</TableCell>
                          <TableCell className="text-xs tabular-nums">{d.sistema}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            {rangoHoras(d.turnoIngreso, d.turnoSalida)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-center text-xs tabular-nums',
                              leve && 'font-semibold text-amber-700',
                              grave && 'font-semibold text-rose-700',
                            )}
                          >
                            {rangoHoras(d.marcaIngreso, d.marcaSalida)}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                            {rangoHoras(d.ingreso, d.egreso)}
                          </TableCell>
                          <TableCell className={cn('text-right tabular-nums', trabajado && 'font-medium')}>
                            {d.efectivas.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {fmtCumpl(d.metaDia, d.unidad)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {fmtCumpl(d.ejecutado, d.unidad)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right text-xs tabular-nums',
                              d.cumplimientoPct == null
                                ? 'text-muted-foreground'
                                : d.cumplioMeta
                                  ? 'font-semibold text-emerald-600'
                                  : 'text-amber-600',
                            )}
                          >
                            {d.cumplimientoPct == null ? '—' : `${d.cumplimientoPct.toFixed(2)}%`}
                          </TableCell>
                          <TableCell>
                            <EstadoDia dia={d} trabajado={trabajado} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
