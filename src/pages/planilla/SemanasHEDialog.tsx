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
          <DialogTitle>Horas extra · {linea?.nombre}</DialogTitle>
          <DialogDescription>
            Excedente semanal = horas efectivas (turno programado validado contra el biométrico, menos
            1 h de almuerzo) − ordinarias del sistema (44 h día / 36 h noche, proporcional). Una semana
            con déficit aporta 0 y no se arrastra.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin turnos con marcaje en las semanas de esta planilla.
          </p>
        ) : (
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
              <TableRow className="font-semibold">
                <TableCell colSpan={7}>Total del período</TableCell>
                <TableCell className="text-right tabular-nums">
                  {h(data.reduce((a, s) => a + s.saldoDia, 0))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {h(data.reduce((a, s) => a + s.saldoNoche, 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
