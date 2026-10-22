import { Icon } from '@iconify/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSemanasHEPlanilla } from '@/hooks/useNomina'
import { formatDate } from '@/lib/utils'
import type { LineaNomina } from '@/types/nomina'
import { numeroSemanaISO } from './semanas'

interface Props {
  idPlanilla: number
  linea: LineaNomina | null
  onClose: () => void
}

const h = (n: number) => n.toFixed(2)

// Desglose semanal usado en la planilla (réplica de las columnas H–W del "Resumen v2").
export function SemanasHEDialog({ idPlanilla, linea, onClose }: Props) {
  const { data, isLoading } = useSemanasHEPlanilla(idPlanilla, linea?.idEmpleado ?? null)

  return (
    <Dialog open={linea !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="solar:clock-circle-bold" width={20} className="text-sky-500" />
            Horas extra · {linea?.nombre}
          </DialogTitle>
          <DialogDescription>
            Excedente semanal = horas efectivas (turno programado validado contra el biométrico, menos
            1 h de almuerzo) − ordinarias del sistema (44 h día / 36 h noche, proporcional). Una semana
            con déficit aporta 0 y no se arrastra.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Icon icon="solar:inbox-bold" width={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">Sin turnos con marcaje en las semanas de esta planilla.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Efectivas</TableHead>
                  <TableHead className="text-right">Ordinarias</TableHead>
                  <TableHead className="text-right">Excedente</TableHead>
                  <TableHead className="text-right">% Día</TableHead>
                  <TableHead className="text-right">HE día</TableHead>
                  <TableHead className="text-right">HE noche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.desde}>
                    <TableCell>
                      {numeroSemanaISO(s.desde)} · {formatDate(s.desde)} – {formatDate(s.hasta)}
                    </TableCell>
                    <TableCell className="tabular-nums">{s.sistema}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.diasEnSemana}</TableCell>
                    <TableCell className="text-right tabular-nums">{h(s.horasEfectivas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{h(s.ordinarias)}</TableCell>
                    <TableCell className="text-right tabular-nums">{h(s.excedente)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(s.propDia * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{h(s.saldoDia)}</TableCell>
                    <TableCell className="text-right tabular-nums">{h(s.saldoNoche)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-50">
                  <TableCell colSpan={7}>Total del período</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-700">
                    {h(data.reduce((a, s) => a + s.saldoDia, 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sky-700">
                    {h(data.reduce((a, s) => a + s.saldoNoche, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
