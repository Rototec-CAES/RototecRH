import { Tag } from '@/shared/report/report-ui'
import type { EstadoEmpleadoType } from '@/types'

export function EmpleadoStatusBadge({ estado }: { estado: EstadoEmpleadoType }) {
  if (estado === 'ACTIVO') {
    return <Tag value="Activo" severity="success" icon="solar:check-circle-bold" />
  }
  return <Tag value="Baja" severity="danger" icon="solar:close-circle-bold" />
}
