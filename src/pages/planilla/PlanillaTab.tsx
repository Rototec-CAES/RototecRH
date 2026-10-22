import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/DataTable'
import { TableResultCount, TableSearch } from '@/components/shared/TableToolbar'
import { KpiCard, Panel, Tag } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import {
  useActualizarLineaNomina,
  useCerrarPlanillaNomina,
  useEliminarPlanillaNomina,
  usePlanillaPeriodo,
  usePropuestaPlanilla,
} from '@/hooks/useNomina'
import { exportarNominaExcel, tituloQuincena } from '@/lib/exportNomina'
import { cn, formatDate, formatQ } from '@/lib/utils'
import type { LineaNomina, LineaNominaParche, PeriodoPlanilla, PlanillaNomina } from '@/types/nomina'
import { EditableCell } from './EditableCell'
import { GenerarPlanillaDialog } from './GenerarPlanillaDialog'
import { SemanasHEDialog } from './SemanasHEDialog'

const TID = 'rh-planilla'

interface Props {
  periodo: PeriodoPlanilla
  empresa: string
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function PlanillaTab({ periodo, empresa }: Props) {
  const planillaQ = usePlanillaPeriodo(periodo)
  const propuestaQ = usePropuestaPlanilla(periodo)
  const actualizar = useActualizarLineaNomina()
  const cerrar = useCerrarPlanillaNomina()
  const eliminar = useEliminarPlanillaNomina()

  const [dialogo, setDialogo] = useState(false)
  const [detalleHE, setDetalleHE] = useState<LineaNomina | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [exportando, setExportando] = useState(false)

  const planilla = planillaQ.data ?? null
  const editable = planilla?.estado === 'BORRADOR'

  const lineas = useMemo(() => {
    if (!planilla) return []
    const q = norm(busqueda.trim())
    return q
      ? planilla.lineas.filter((l) => norm(`${l.nombre} ${l.codigo ?? ''} ${l.puesto ?? ''}`).includes(q))
      : planilla.lineas
  }, [planilla, busqueda])

  function onCambiar(l: LineaNomina, parche: LineaNominaParche) {
    if (!planilla) return
    actualizar.mutate(
      { id: planilla.id, idEmpleado: l.idEmpleado, parche },
      { onError: (err) => toast.error(extractApiErrorMessage(err)) },
    )
  }

  async function onCerrar() {
    if (!planilla) return
    const ok = await confirmar({
      titulo: '¿Cerrar la planilla?',
      mensaje:
        'Al cerrar, la planilla queda inmutable y se descuentan las cuotas del saldo de préstamos y embargos. ¿Continuar?',
      textoConfirmar: 'Cerrar planilla',
      peligro: true,
    })
    if (!ok) return
    try {
      await cerrar.mutateAsync(planilla.id)
      toast.success('Planilla cerrada')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  async function onEliminar() {
    if (!planilla) return
    const ok = await confirmar({
      titulo: '¿Eliminar este borrador?',
      mensaje: '¿Eliminar este borrador de planilla? Se pierden las capturas manuales.',
      textoConfirmar: 'Eliminar borrador',
      peligro: true,
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync(planilla.id)
      toast.success('Borrador eliminado')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  async function onExportar() {
    if (!planilla) return
    setExportando(true)
    try {
      await exportarNominaExcel(planilla, empresa)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  const propuesta = propuestaQ.data

  return (
    <div className="space-y-5">
      {/* Encabezado del período + acciones */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Icon icon="solar:calendar-bold" width={20} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">{tituloQuincena(periodo)}</p>
              {planilla && (
                <Tag
                  value={editable ? 'Borrador' : 'Cerrada'}
                  severity={editable ? 'warning' : 'success'}
                  icon={editable ? 'solar:pen-2-bold' : 'solar:lock-keyhole-bold'}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5 tabular-nums">
                <Icon icon="solar:calendar-mark-linear" width={15} className="text-slate-400" />
                {formatDate(planilla?.fechaDesde ?? propuesta?.fechaDesde)} –{' '}
                {formatDate(planilla?.fechaHasta ?? propuesta?.fechaHasta)}
              </span>
              {planilla && (
                <span className="flex items-center gap-1.5">
                  <Icon icon="solar:clock-circle-linear" width={15} className="text-slate-400" />
                  Horas extra:{' '}
                  {planilla.semanasHE.length
                    ? `semanas ${planilla.semanasHE.map((s) => s.clave.split('-W')[1]).join(', ')} (${formatDate(planilla.semanaHEDesde)} – ${formatDate(planilla.semanaHEHasta)})`
                    : 'no incluidas'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {planilla && (
            <Button
              onClick={onExportar}
              disabled={exportando}
              className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              data-testid={`${TID}__btn-excel`}
            >
              <Icon icon={exportando ? 'svg-spinners:180-ring' : 'solar:file-download-linear'} width={16} />
              Exportar Excel
            </Button>
          )}
          {editable && (
            <>
              <Button variant="outline" onClick={() => setDialogo(true)} data-testid={`${TID}__btn-regenerar`}>
                <Icon icon="solar:refresh-bold" width={16} />
                Regenerar
              </Button>
              <Button
                variant="outline"
                onClick={onEliminar}
                disabled={eliminar.isPending}
                className="text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                data-testid={`${TID}__btn-eliminar`}
              >
                <Icon icon={eliminar.isPending ? 'svg-spinners:180-ring' : 'solar:trash-bin-trash-bold'} width={16} />
                Eliminar
              </Button>
              <Button
                variant="destructive"
                onClick={onCerrar}
                disabled={cerrar.isPending}
                data-testid={`${TID}__btn-cerrar`}
              >
                <Icon icon={cerrar.isPending ? 'svg-spinners:180-ring' : 'solar:lock-keyhole-bold'} width={16} />
                Cerrar planilla
              </Button>
            </>
          )}
        </div>
      </div>

      {planillaQ.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : planillaQ.isError ? (
        <Aviso tono="danger" icon="solar:danger-triangle-bold" titulo="No se pudo consultar la planilla">
          {extractApiErrorMessage(planillaQ.error)}
        </Aviso>
      ) : !planilla ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon="solar:document-add-bold"
            title="No hay planilla para este período"
            description={
              propuesta
                ? propuesta.semanaHEDesde
                  ? `Horas extra pendientes: ${propuesta.semanasHE.length} semana(s), del ${formatDate(propuesta.semanaHEDesde)} al ${formatDate(propuesta.semanaHEHasta)}.`
                  : 'No hay semanas de horas extra pendientes de pago.'
                : undefined
            }
            className="pb-6"
          />
          <div className="flex justify-center pb-10">
            <Button
              onClick={() => setDialogo(true)}
              disabled={!propuesta}
              className="bg-cyan-600 text-white hover:bg-cyan-700"
              data-testid={`${TID}__btn-generar`}
            >
              <Icon icon="solar:calculator-bold" width={16} />
              Generar planilla
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!editable && (
            <Aviso tono="info" icon="solar:lock-keyhole-bold" titulo="Planilla cerrada">
              Cerrada el {formatDate(planilla.fechaCierre)}. Los valores son inmutables; solo se puede exportar.
            </Aviso>
          )}

          <AvisosCard planilla={planilla} />

          {/* Totales de la planilla (los mismos de la fila de totales) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Colaboradores"
              value={planilla.totales.cantidadEmpleados}
              accent="slate"
              icon="solar:users-group-rounded-bold"
              testId={`${TID}__kpi-colaboradores`}
            />
            <KpiCard
              label="Total ingresos"
              value={formatQ(planilla.totales.totalIngresos ?? 0)}
              accent="emerald"
              icon="solar:arrow-down-bold"
              testId={`${TID}__kpi-ingresos`}
            />
            <KpiCard
              label="Total deducciones"
              value={formatQ(planilla.totales.totalDeducciones ?? 0)}
              accent="rose"
              icon="solar:arrow-up-bold"
              testId={`${TID}__kpi-deducciones`}
            />
            <KpiCard
              label="Total líquido a pagar"
              value={formatQ(planilla.totales.liquido ?? 0)}
              accent="sky"
              icon="solar:wallet-money-bold"
              testId={`${TID}__kpi-liquido`}
            />
          </section>

          <Panel
            flush
            title="Cálculo de nómina por colaborador"
            subtitle={
              editable
                ? 'Las celdas con borde son editables: escribe el valor y sal de la celda para guardar. Haz clic en un monto de horas extra para ver su desglose.'
                : 'Haz clic en un monto de horas extra para ver su desglose por semana.'
            }
            right={
              <div className="flex flex-wrap items-center gap-2">
                <TableSearch
                  value={busqueda}
                  onChange={setBusqueda}
                  placeholder="Buscar colaborador…"
                  className="w-full sm:w-64"
                  testId={`${TID}__filtro-busqueda`}
                />
                <TableResultCount
                  total={planilla.lineas.length}
                  filtered={lineas.length}
                  label="colaborador"
                  plural="colaboradores"
                />
              </div>
            }
          >
            <TablaNomina
              planilla={planilla}
              lineas={lineas}
              editable={editable}
              onCambiar={onCambiar}
              onVerHE={setDetalleHE}
            />
          </Panel>

          <Panel
            title="Cargas patronales y provisiones"
            subtitle="Para contabilidad: no se descuentan al colaborador."
            icon="solar:buildings-2-bold"
          >
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-7">
              <Stat label="Vacaciones" value={planilla.totales.provVacaciones} />
              <Stat label="Bono 14" value={planilla.totales.provBono14} />
              <Stat label="Aguinaldo" value={planilla.totales.provAguinaldo} />
              <Stat label="Indemnización" value={planilla.totales.provIndemnizacion} />
              <Stat label="IGSS patronal" value={planilla.totales.igssPatronal} />
              <Stat label="IRTRA" value={planilla.totales.irtra} />
              <Stat label="INTECAP" value={planilla.totales.intecap} />
            </div>
          </Panel>
        </>
      )}

      <GenerarPlanillaDialog
        open={dialogo}
        onOpenChange={setDialogo}
        periodo={periodo}
        propuesta={propuesta}
        actual={editable ? planilla : null}
      />
      {planilla && (
        <SemanasHEDialog idPlanilla={planilla.id} linea={detalleHE} onClose={() => setDetalleHE(null)} />
      )}
    </div>
  )
}

const AVISO_TONOS = {
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: 'text-amber-600' },
  danger: { box: 'border-rose-200 bg-rose-50 text-rose-800', icon: 'text-rose-600' },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: 'text-sky-600' },
} as const

function Aviso({
  tono,
  icon,
  titulo,
  children,
}: {
  tono: keyof typeof AVISO_TONOS
  icon: string
  titulo: ReactNode
  children: ReactNode
}) {
  const t = AVISO_TONOS[tono]
  return (
    <div role="alert" className={cn('flex gap-3 rounded-2xl border p-4 text-sm', t.box)}>
      <Icon icon={icon} width={20} className={cn('mt-0.5 shrink-0', t.icon)} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{formatQ(value ?? 0)}</p>
    </div>
  )
}

function AvisosCard({ planilla }: { planilla: PlanillaNomina }) {
  const { sinSalario, sinMarcas, heNoIncluidas, generales } = planilla.avisos
  const conAvisos = planilla.lineas.filter((l) => l.avisos.length).length
  if (!sinSalario.length && !sinMarcas.length && !heNoIncluidas.length && !generales.length && !conAvisos) {
    return null
  }
  return (
    <Aviso tono="warning" icon="solar:danger-triangle-bold" titulo="Revisar antes de cerrar">
      <div className="space-y-1.5 text-xs">
        {generales.map((g) => (
          <p key={g}>{g}</p>
        ))}
        {conAvisos > 0 && (
          <p className="flex items-center gap-1">
            {conAvisos} colaborador(es) con observaciones (ícono
            <Icon icon="solar:danger-triangle-bold" width={13} className="text-amber-600" />
            en su fila; pasa el cursor para verlas).
          </p>
        )}
        <ListaAvisos
          titulo={`${sinSalario.length} colaborador(es) activos sin salario cargado: no entran a la planilla`}
          items={sinSalario.map((e) => e.nombre)}
        />
        <ListaAvisos
          titulo={`${sinMarcas.length} colaborador(es) con turno programado pero sin ningún marcaje en las semanas de horas extra`}
          items={sinMarcas.map((e) => `${e.nombre} (${e.diasProgramados} días programados)`)}
        />
        <ListaAvisos
          titulo={`${heNoIncluidas.length} persona(s) con horas extra que no están en esta planilla (otra empresa, sin salario o sin nómina habilitada)`}
          items={heNoIncluidas.map((e) => `${e.nombre}: ${e.horas.toFixed(2)} h`)}
        />
      </div>
    </Aviso>
  )
}

function ListaAvisos({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null
  return (
    <details className="group rounded-lg bg-white/60 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium">
        <Icon icon="solar:alt-arrow-right-linear" width={14} className="shrink-0 transition-transform group-open:rotate-90" />
        {titulo}
      </summary>
      <ul className="ml-6 mt-1.5 max-h-40 list-disc space-y-0.5 overflow-y-auto">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </details>
  )
}

// ---------------------------------------------------------------------------------------------
// Tabla con las columnas de la hoja "04 Calculo Nomina"
// ---------------------------------------------------------------------------------------------

type CampoEditable = Exclude<keyof LineaNominaParche, 'heDiurnaOverride' | 'heNocturnaOverride' | 'isrOverride' | 'notas'>

const OVERRIDE_CLS = 'border-amber-400 bg-amber-50 text-amber-900'

function TablaNomina({
  planilla,
  lineas,
  editable,
  onCambiar,
  onVerHE,
}: {
  planilla: PlanillaNomina
  lineas: LineaNomina[]
  editable: boolean
  onCambiar: (l: LineaNomina, parche: LineaNominaParche) => void
  onVerHE: (l: LineaNomina) => void
}) {
  const t = planilla.totales
  const num = 'text-right tabular-nums whitespace-nowrap'
  const th = 'text-right whitespace-nowrap'
  // Columnas de totales (resaltadas) y la de líquido a pagar.
  const tot = 'bg-slate-50/70 font-semibold text-slate-900'
  const liq = 'bg-sky-50/70'

  const editableCell = (l: LineaNomina, campo: CampoEditable) => (
    <TableCell className={`${num} min-w-[84px]`}>
      <EditableCell initial={l[campo]} onCommit={(n) => onCambiar(l, { [campo]: n })} disabled={!editable} />
    </TableCell>
  )

  const horasOverride = (l: LineaNomina, tipo: 'diurna' | 'nocturna') => {
    const override = tipo === 'diurna' ? l.heDiurnaOverride : l.heNocturnaOverride
    const calc = tipo === 'diurna' ? l.heDiurnaHorasCalc : l.heNocturnaHorasCalc
    const campo = tipo === 'diurna' ? 'heDiurnaOverride' : 'heNocturnaOverride'
    return (
      <TableCell className={`${num} min-w-[96px]`}>
        <div className="flex items-center gap-1">
          <EditableCell
            initial={override ?? calc}
            onCommit={(n) => onCambiar(l, { [campo]: n })}
            disabled={!editable}
            className={override !== null ? OVERRIDE_CLS : ''}
          />
          {override !== null && editable && (
            <button
              type="button"
              title={`Volver al calculado (${calc.toFixed(2)} h)`}
              onClick={() => onCambiar(l, { [campo]: null })}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon icon="solar:undo-left-round-linear" width={13} />
            </button>
          )}
        </div>
      </TableCell>
    )
  }

  const grupo = 'border-b border-slate-100 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest'

  return (
    <Table className="text-xs">
      <TableHeader>
        {/* Grupos de columnas (solo rótulo; el orden de columnas es el de siempre) */}
        <tr>
          <th className={cn(grupo, 'sticky left-0 z-20 bg-slate-50 text-left text-slate-400')}>&nbsp;</th>
          <th colSpan={2} className={cn(grupo, 'bg-slate-100/70 text-slate-500')}>Días</th>
          <th colSpan={15} className={cn(grupo, 'bg-emerald-50 text-emerald-700')}>Ingresos</th>
          <th colSpan={7} className={cn(grupo, 'bg-rose-50 text-rose-700')}>Deducciones</th>
          <th className={cn(grupo, 'bg-sky-50 text-sky-700')}>A pagar</th>
        </tr>
        <TableRow>
          <TableHead className="sticky left-0 z-20 min-w-[220px] bg-slate-50">Colaborador</TableHead>
          <TableHead className={th} title="D: días laborados">Días</TableHead>
          <TableHead className={th} title="E: días de vacaciones">Vac.</TableHead>
          <TableHead className={th}>Salario ord.</TableHead>
          <TableHead className={th}>Vacaciones</TableHead>
          <TableHead className={th}>Bonif. 37-2001</TableHead>
          <TableHead className={th}>HE diurna h</TableHead>
          <TableHead className={th}>HE diurna Q</TableHead>
          <TableHead className={th}>HE noct. h</TableHead>
          <TableHead className={th}>HE noct. Q</TableHead>
          <TableHead className={th}>Total HE</TableHead>
          <TableHead className={th}>Bolsón máq.</TableHead>
          <TableHead className={th}>Bono rend.</TableHead>
          <TableHead className={th}>Bono km</TableHead>
          <TableHead className={th}>Bono KPI</TableHead>
          <TableHead className={th}>Comisiones</TableHead>
          <TableHead className={th}>Otros ing.</TableHead>
          <TableHead className={cn(th, 'text-slate-700')}>T. ingresos</TableHead>
          <TableHead className={th}>Préstamos</TableHead>
          <TableHead className={th}>Anticipos</TableHead>
          <TableHead className={th}>Embargos</TableHead>
          <TableHead className={th}>Otros desc.</TableHead>
          <TableHead className={th}>IGSS</TableHead>
          <TableHead className={th}>ISR</TableHead>
          <TableHead className={cn(th, 'text-slate-700')}>T. deducciones</TableHead>
          <TableHead className={cn(th, 'text-sky-700')}>Líquido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineas.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={26}>
              <EmptyState title="Ningún colaborador coincide con la búsqueda" />
            </TableCell>
          </TableRow>
        )}
        {lineas.map((l) => (
          <TableRow key={l.idEmpleado} className="group">
            <TableCell className="sticky left-0 z-10 bg-white group-hover:bg-slate-50">
              <div className="flex items-start gap-1.5">
                {l.avisos.length > 0 && (
                  <span title={l.avisos.join('\n')} className="mt-0.5 shrink-0 cursor-help">
                    <Icon icon="solar:danger-triangle-bold" width={14} className="text-amber-500" />
                  </span>
                )}
                <div>
                  <p className="font-semibold text-slate-800">{l.nombre}</p>
                  <p className="text-[10px] text-slate-500">
                    {l.codigo} · {l.puesto ?? 'Sin puesto'} · {formatQ(l.salarioBase)}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className={num} title={l.diasNoPagados ? `${l.diasNoPagados} día(s) no pagados por ausencias` : undefined}>
              <span className={l.diasNoPagados || l.diasFueraContrato ? 'font-semibold text-amber-700' : ''}>{l.diasLaborados}</span>
            </TableCell>
            <TableCell className={num}>{l.diasVacaciones || ''}</TableCell>
            <TableCell className={num}>{formatQ(l.salarioOrdinario)}</TableCell>
            <TableCell className={num}>{formatQ(l.vacaciones)}</TableCell>
            <TableCell className={num}>{formatQ(l.bonificacion)}</TableCell>
            {horasOverride(l, 'diurna')}
            <TableCell className={num}>
              <button
                type="button"
                className="text-sky-600 underline-offset-2 hover:text-sky-700 hover:underline"
                title="Ver desglose de horas extra"
                onClick={() => onVerHE(l)}
              >
                {formatQ(l.heDiurnaMonto)}
              </button>
            </TableCell>
            {horasOverride(l, 'nocturna')}
            <TableCell className={num}>
              <button
                type="button"
                className="text-sky-600 underline-offset-2 hover:text-sky-700 hover:underline"
                title="Ver desglose de horas extra"
                onClick={() => onVerHE(l)}
              >
                {formatQ(l.heNocturnaMonto)}
              </button>
            </TableCell>
            <TableCell className={num}>{formatQ(l.heTotal)}</TableCell>
            {editableCell(l, 'bolsonMaquinas')}
            {editableCell(l, 'bonoRendimiento')}
            {editableCell(l, 'bonoKilometraje')}
            {editableCell(l, 'bonoKPI')}
            {editableCell(l, 'comisiones')}
            {editableCell(l, 'otrosIngresos')}
            <TableCell className={cn(num, tot)}>{formatQ(l.totalIngresos)}</TableCell>
            <TableCell className={num} title="Préstamos activos (pestaña Préstamos y embargos)">
              {formatQ(l.prestamos)}
            </TableCell>
            {editableCell(l, 'anticipos')}
            <TableCell className={num} title="Embargos activos (pestaña Préstamos y embargos)">
              {formatQ(l.embargos)}
            </TableCell>
            {editableCell(l, 'otrosDescuentos')}
            <TableCell className={num}>{formatQ(l.igss)}</TableCell>
            <TableCell className={`${num} min-w-[84px]`}>
              <EditableCell
                initial={l.isr}
                onCommit={(n) => onCambiar(l, { isrOverride: n })}
                disabled={!editable}
                className={l.isrOverride !== null ? OVERRIDE_CLS : ''}
              />
            </TableCell>
            <TableCell className={cn(num, tot)}>{formatQ(l.totalDeducciones)}</TableCell>
            <TableCell className={cn(num, liq, 'text-sm font-bold', l.liquido < 0 ? 'text-rose-600' : 'text-slate-900')}>
              {formatQ(l.liquido)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-slate-50">
          <TableCell className="sticky left-0 z-10 bg-slate-50">Totales · {t.cantidadEmpleados} colaboradores</TableCell>
          <TableCell className={num}>{t.diasLaborados}</TableCell>
          <TableCell className={num}>{t.diasVacaciones}</TableCell>
          {(
            [
              'salarioOrdinario', 'vacaciones', 'bonificacion', 'heDiurnaHoras', 'heDiurnaMonto',
              'heNocturnaHoras', 'heNocturnaMonto', 'heTotal',
              'bolsonMaquinas', 'bonoRendimiento', 'bonoKilometraje', 'bonoKPI', 'comisiones',
              'otrosIngresos', 'totalIngresos', 'prestamos', 'anticipos', 'embargos',
              'otrosDescuentos', 'igss', 'isr', 'totalDeducciones', 'liquido',
            ] as const
          ).map((c) => (
            <TableCell key={c} className={cn(num, c === 'liquido' && 'bg-sky-50 text-sm font-bold text-sky-800')}>
              {c.endsWith('Horas') ? (t[c] ?? 0).toFixed(2) : formatQ(t[c] ?? 0)}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
}
