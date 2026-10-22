import { toast } from 'sonner'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Panel } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import { useActualizarParametroNomina, useParametrosNomina } from '@/hooks/useNomina'
import { EditableCell } from './EditableCell'

// Parámetros del motor de nómina (tNominaParametros). Un cambio aplica a la próxima generación o
// edición de una planilla en borrador; las planillas cerradas no se recalculan.
export function ParametrosTab() {
  const { data, isLoading } = useParametrosNomina()
  const actualizar = useActualizarParametroNomina()

  return (
    <Panel
      flush
      icon="solar:tuning-2-bold"
      title="Parámetros de nómina"
      subtitle="Tasas y divisores que usa el cálculo. Los cambios aplican al generar o editar una planilla en borrador; las cerradas conservan sus valores. Las tasas van en decimal (4.83 % = 0.0483)."
    >
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Parámetro</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-36 text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((p) => (
              <TableRow key={p.clave}>
                <TableCell className="font-mono font-semibold text-slate-800">{p.clave}</TableCell>
                <TableCell className="text-slate-600">{p.descripcion}</TableCell>
                <TableCell className="text-right">
                  <EditableCell
                    initial={p.valor}
                    step="0.000001"
                    onCommit={(valor) =>
                      actualizar.mutate(
                        { clave: p.clave, valor },
                        {
                          onSuccess: () => toast.success(`${p.clave} actualizado`),
                          onError: (err) => toast.error(extractApiErrorMessage(err)),
                        },
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
