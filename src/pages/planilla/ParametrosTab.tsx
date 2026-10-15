import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
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
import { useActualizarParametroNomina, useParametrosNomina } from '@/hooks/useNomina'
import { EditableCell } from './EditableCell'

// Parámetros del motor de nómina (tNominaParametros). Un cambio aplica a la próxima generación o
// edición de una planilla en borrador; las planillas cerradas no se recalculan.
export function ParametrosTab() {
  const { data, isLoading } = useParametrosNomina()
  const actualizar = useActualizarParametroNomina()

  return (
    <Card className="overflow-x-auto">
      <div className="border-b p-4">
        <p className="font-semibold">Parámetros de nómina</p>
        <p className="text-xs text-muted-foreground">
          Tasas y divisores que usa el cálculo. Los cambios aplican al generar o editar una planilla en
          borrador; las cerradas conservan sus valores. Las tasas van en decimal (4.83 % = 0.0483).
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
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
                <TableCell className="font-mono">{p.clave}</TableCell>
                <TableCell>{p.descripcion}</TableCell>
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
    </Card>
  )
}
