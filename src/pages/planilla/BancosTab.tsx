import { Icon } from '@iconify/react'
import { toast } from 'sonner'

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
import { EmptyState } from '@/components/shared/DataTable'
import { Panel, Tag } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import { useBancosNomina, useGuardarEquivalenciaBanco } from '@/hooks/useNomina'

const SIN_BANCO = 'none'

// Equivalencia de los códigos de banco que tienen los empleados (tEmpleados.codigo_banco: 105, 107…)
// con el catálogo tBancos. La hoja "Pago bancario" de la planilla usa el banco resuelto.
export function BancosTab() {
  const { data, isLoading } = useBancosNomina()
  const guardar = useGuardarEquivalenciaBanco()
  const pendientes = data?.codigos.filter((c) => c.idBanco === null).length ?? 0

  return (
    <Panel
      flush
      icon="solar:card-bold"
      title="Equivalencia de bancos"
      subtitle={
        <>
          Indica a qué banco del catálogo corresponde cada código de banco que tienen los colaboradores. Los
          códigos que ya son del catálogo (BI, BR, BAM…) se resuelven solos. Mientras un código no tenga
          equivalencia, la planilla lo marca como aviso y la hoja de pago bancario dice "Sin equivalencia".
        </>
      }
      right={
        pendientes > 0 ? (
          <Tag value={`${pendientes} código(s) sin equivalencia`} severity="warning" icon="solar:danger-triangle-bold" />
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !data?.codigos.length ? (
        <EmptyState icon="solar:card-bold" title="Ningún colaborador tiene código de banco" />
      ) : (
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Código en empleados</TableHead>
              <TableHead className="text-right">Colaboradores</TableHead>
              <TableHead className="text-right">Activos</TableHead>
              <TableHead className="w-72">Banco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.codigos.map((c) => (
              <TableRow key={c.codigo} className={c.idBanco === null ? 'bg-amber-50/50 hover:bg-amber-50' : undefined}>
                <TableCell className="font-mono font-semibold text-slate-800">{c.codigo}</TableCell>
                <TableCell className="text-right tabular-nums">{c.empleados}</TableCell>
                <TableCell className="text-right tabular-nums">{c.activos}</TableCell>
                <TableCell>
                  {c.directo ? (
                    <span className="flex items-center gap-2">
                      {data.bancos.find((b) => b.id === c.idBanco)?.nombre}
                      <Tag value="del catálogo" severity="secondary" icon="solar:check-circle-linear" />
                    </span>
                  ) : (
                    <Select
                      value={c.idBanco === null ? SIN_BANCO : String(c.idBanco)}
                      disabled={guardar.isPending}
                      onValueChange={(v) =>
                        guardar.mutate(
                          { codigo: c.codigo, idBanco: v === SIN_BANCO ? null : Number(v) },
                          {
                            onSuccess: () => toast.success(`Código ${c.codigo} actualizado`),
                            onError: (err) => toast.error(extractApiErrorMessage(err)),
                          },
                        )
                      }
                    >
                      <SelectTrigger className={c.idBanco === null ? 'border-amber-400 bg-amber-50' : undefined}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_BANCO}>— Sin equivalencia —</SelectItem>
                        {data.bancos.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.nombre} ({b.codigo}{b.pais ? ` · ${b.pais}` : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {guardar.isPending && (
        <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-2 text-xs text-slate-500">
          <Icon icon="svg-spinners:180-ring" width={14} className="text-sky-500" />
          Guardando…
        </p>
      )}
    </Panel>
  )
}
