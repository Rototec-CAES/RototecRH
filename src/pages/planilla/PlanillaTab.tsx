import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { extractApiErrorMessage } from '@/api/client'
import {
  useActualizarLineaNomina,
  useCerrarPlanillaNomina,
  useEliminarPlanillaNomina,
  usePlanillaPeriodo,
  usePropuestaPlanilla,
} from '@/hooks/useNomina'
import { exportarNominaExcel, tituloQuincena } from '@/lib/exportNomina'
import { formatDate, formatQ } from '@/lib/utils'
import type { LineaNomina, LineaNominaParche, PeriodoPlanilla, PlanillaNomina } from '@/types/nomina'
import { EditableCell } from './EditableCell'
import { GenerarPlanillaDialog } from './GenerarPlanillaDialog'
import { SemanasHEDialog } from './SemanasHEDialog'

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
    if (!confirm('Al cerrar, la planilla queda inmutable y se descuentan las cuotas del saldo de préstamos y embargos. ¿Continuar?')) return
    try {
      await cerrar.mutateAsync(planilla.id)
      toast.success('Planilla cerrada')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  async function onEliminar() {
    if (!planilla) return
    if (!confirm('¿Eliminar este borrador de planilla? Se pierden las capturas manuales.')) return
    try {
      await eliminar.mutateAsync(planilla.id)
      toast.success('Borrador eliminado')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  async function onExportar() {
    if (!planilla) return
    try {
      await exportarNominaExcel(planilla, empresa)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    }
  }

  const propuesta = propuestaQ.data

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{tituloQuincena(periodo)}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {formatDate(planilla?.fechaDesde ?? propuesta?.fechaDesde)} –{' '}
              {formatDate(planilla?.fechaHasta ?? propuesta?.fechaHasta)}
            </span>
            {planilla && (
              <span>
                Horas extra:{' '}
                {planilla.semanasHE.length
                  ? `semanas ${planilla.semanasHE.map((s) => s.clave.split('-W')[1]).join(', ')} (${formatDate(planilla.semanaHEDesde)} – ${formatDate(planilla.semanaHEHasta)})`
                  : 'no incluidas'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {planilla && (
            <Badge variant={editable ? 'warning' : 'success'}>{editable ? 'Borrador' : 'Cerrada'}</Badge>
          )}
          {planilla && (
            <Button variant="outline" onClick={onExportar}>
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          )}
          {editable && (
            <>
              <Button variant="outline" onClick={() => setDialogo(true)}>
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </Button>
              <Button variant="outline" onClick={onEliminar} disabled={eliminar.isPending}>
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
              <Button variant="destructive" onClick={onCerrar} disabled={cerrar.isPending}>
                <Lock className="h-4 w-4" />
                Cerrar planilla
              </Button>
            </>
          )}
        </div>
      </Card>

      {planillaQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : planillaQ.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudo consultar la planilla</AlertTitle>
          <AlertDescription>{extractApiErrorMessage(planillaQ.error)}</AlertDescription>
        </Alert>
      ) : !planilla ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay planilla para esta quincena.</p>
          {propuesta && (
            <p className="text-xs text-muted-foreground">
              {propuesta.semanaHEDesde
                ? `Horas extra pendientes: ${propuesta.semanasHE.length} semana(s), del ${formatDate(propuesta.semanaHEDesde)} al ${formatDate(propuesta.semanaHEHasta)}.`
                : 'No hay semanas de horas extra pendientes de pago.'}
            </p>
          )}
          <Button onClick={() => setDialogo(true)} disabled={!propuesta}>
            Generar planilla
          </Button>
        </Card>
      ) : (
        <>
          {!editable && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Planilla cerrada</AlertTitle>
              <AlertDescription>
                Cerrada el {formatDate(planilla.fechaCierre)}. Los valores son inmutables; solo se puede exportar.
              </AlertDescription>
            </Alert>
          )}

          <AvisosCard planilla={planilla} />

          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar colaborador…"
                className="pl-8"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {lineas.length} de {planilla.lineas.length} colaboradores
            </span>
          </div>

          <Card className="overflow-x-auto">
            <TablaNomina
              planilla={planilla}
              lineas={lineas}
              editable={editable}
              onCambiar={onCambiar}
              onVerHE={setDetalleHE}
            />
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Cargas patronales y provisiones (contabilidad)</p>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-7">
              <Stat label="Vacaciones" value={planilla.totales.provVacaciones} />
              <Stat label="Bono 14" value={planilla.totales.provBono14} />
              <Stat label="Aguinaldo" value={planilla.totales.provAguinaldo} />
              <Stat label="Indemnización" value={planilla.totales.provIndemnizacion} />
              <Stat label="IGSS patronal" value={planilla.totales.igssPatronal} />
              <Stat label="IRTRA" value={planilla.totales.irtra} />
              <Stat label="INTECAP" value={planilla.totales.intecap} />
            </div>
          </Card>
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

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{formatQ(value ?? 0)}</p>
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
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Revisar antes de cerrar</AlertTitle>
      <AlertDescription className="space-y-1 text-xs">
        {generales.map((g) => (
          <p key={g}>{g}</p>
        ))}
        {conAvisos > 0 && (
          <p>{conAvisos} colaborador(es) con observaciones (ícono ⚠ en su fila; pasa el cursor para verlas).</p>
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
      </AlertDescription>
    </Alert>
  )
}

function ListaAvisos({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null
  return (
    <details>
      <summary className="cursor-pointer">{titulo}</summary>
      <ul className="ml-4 mt-1 max-h-40 list-disc overflow-y-auto">
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
            className={override !== null ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}
          />
          {override !== null && editable && (
            <button
              type="button"
              title={`Volver al calculado (${calc.toFixed(2)} h)`}
              onClick={() => onCambiar(l, { [campo]: null })}
              className="text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </TableCell>
    )
  }

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 min-w-[220px] bg-background">Colaborador</TableHead>
          <TableHead className={th} title="D: días laborados">Días</TableHead>
          <TableHead className={th} title="E: días de vacaciones">Vac.</TableHead>
          <TableHead className={th}>Salario ord.</TableHead>
          <TableHead className={th}>Vacaciones</TableHead>
          <TableHead className={th}>Bonif. 37-2001</TableHead>
          <TableHead className={th}>HE diurna h</TableHead>
          <TableHead className={th}>HE diurna Q</TableHead>
          <TableHead className={th}>HE noct. h</TableHead>
          <TableHead className={th}>HE noct. Q</TableHead>
          <TableHead className={th}>HE mixta h</TableHead>
          <TableHead className={th}>HE mixta Q</TableHead>
          <TableHead className={th}>Total HE</TableHead>
          <TableHead className={th}>Bolsón máq.</TableHead>
          <TableHead className={th}>Bono rend.</TableHead>
          <TableHead className={th}>Bono km</TableHead>
          <TableHead className={th}>Bono KPI</TableHead>
          <TableHead className={th}>Comisiones</TableHead>
          <TableHead className={th}>Otros ing.</TableHead>
          <TableHead className={`${th} font-semibold`}>T. ingresos</TableHead>
          <TableHead className={th}>Préstamos</TableHead>
          <TableHead className={th}>Anticipos</TableHead>
          <TableHead className={th}>Embargos</TableHead>
          <TableHead className={th}>Otros desc.</TableHead>
          <TableHead className={th}>IGSS</TableHead>
          <TableHead className={th}>ISR</TableHead>
          <TableHead className={`${th} font-semibold`}>T. deducciones</TableHead>
          <TableHead className={`${th} font-semibold`}>Líquido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineas.map((l) => (
          <TableRow key={l.idEmpleado}>
            <TableCell className="sticky left-0 z-10 bg-background">
              <div className="flex items-start gap-1">
                {l.avisos.length > 0 && (
                  <span title={l.avisos.join('\n')}>
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  </span>
                )}
                <div>
                  <p className="font-medium">{l.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {l.codigo} · {l.puesto ?? 'Sin puesto'} · {formatQ(l.salarioBase)}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className={num} title={l.diasNoPagados ? `${l.diasNoPagados} día(s) no pagados por ausencias` : undefined}>
              <span className={l.diasNoPagados || l.diasFueraContrato ? 'text-amber-700' : ''}>{l.diasLaborados}</span>
            </TableCell>
            <TableCell className={num}>{l.diasVacaciones || ''}</TableCell>
            <TableCell className={num}>{formatQ(l.salarioOrdinario)}</TableCell>
            <TableCell className={num}>{formatQ(l.vacaciones)}</TableCell>
            <TableCell className={num}>{formatQ(l.bonificacion)}</TableCell>
            {horasOverride(l, 'diurna')}
            <TableCell className={num}>
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => onVerHE(l)}>
                {formatQ(l.heDiurnaMonto)}
              </button>
            </TableCell>
            {horasOverride(l, 'nocturna')}
            <TableCell className={num}>
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => onVerHE(l)}>
                {formatQ(l.heNocturnaMonto)}
              </button>
            </TableCell>
            {editableCell(l, 'heMixtaHoras')}
            <TableCell className={num}>{formatQ(l.heMixtaMonto)}</TableCell>
            <TableCell className={num}>{formatQ(l.heTotal)}</TableCell>
            {editableCell(l, 'bolsonMaquinas')}
            {editableCell(l, 'bonoRendimiento')}
            {editableCell(l, 'bonoKilometraje')}
            {editableCell(l, 'bonoKPI')}
            {editableCell(l, 'comisiones')}
            {editableCell(l, 'otrosIngresos')}
            <TableCell className={`${num} font-medium`}>{formatQ(l.totalIngresos)}</TableCell>
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
                className={l.isrOverride !== null ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}
              />
            </TableCell>
            <TableCell className={`${num} font-medium`}>{formatQ(l.totalDeducciones)}</TableCell>
            <TableCell className={`${num} font-semibold ${l.liquido < 0 ? 'text-destructive' : ''}`}>
              {formatQ(l.liquido)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 bg-muted/50 font-semibold">
          <TableCell className="sticky left-0 z-10 bg-muted/50">Totales · {t.cantidadEmpleados} colaboradores</TableCell>
          <TableCell className={num}>{t.diasLaborados}</TableCell>
          <TableCell className={num}>{t.diasVacaciones}</TableCell>
          {(
            [
              'salarioOrdinario', 'vacaciones', 'bonificacion', 'heDiurnaHoras', 'heDiurnaMonto',
              'heNocturnaHoras', 'heNocturnaMonto', 'heMixtaHoras', 'heMixtaMonto', 'heTotal',
              'bolsonMaquinas', 'bonoRendimiento', 'bonoKilometraje', 'bonoKPI', 'comisiones',
              'otrosIngresos', 'totalIngresos', 'prestamos', 'anticipos', 'embargos',
              'otrosDescuentos', 'igss', 'isr', 'totalDeducciones', 'liquido',
            ] as const
          ).map((c) => (
            <TableCell key={c} className={num}>
              {c.endsWith('Horas') ? (t[c] ?? 0).toFixed(2) : formatQ(t[c] ?? 0)}
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  )
}
