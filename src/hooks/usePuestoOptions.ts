import { useQuery } from '@tanstack/react-query'
import { estructuraPlanaApi } from '@/api/organizacion'
import type { NameOption } from '@/components/ui/name-combobox'

const QK = {
  puestos: ['org', 'puestos'] as const,
  departamentos: ['org', 'departamentos'] as const,
}

/**
 * Obtiene la lista plana de puestos desde GET /rrhh/organizacion/puestos.
 */
export type PuestoOption = NameOption & { idSubdepartamento: number | null; idDepartamento: number | null }

export function usePuestoOptions(): { options: PuestoOption[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: QK.puestos,
    queryFn: () => estructuraPlanaApi.listPuestos(),
    staleTime: 5 * 60 * 1000,
  })
  const options: PuestoOption[] = (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    idSubdepartamento: p.idSubdepartamento ?? null,
    idDepartamento: p.idDepartamento ?? null,
  }))
  return { options, isLoading }
}

/**
 * Obtiene la lista plana de departamentos desde GET /rrhh/organizacion/departamentos.
 */
export function useDepartamentoOptions(): { options: NameOption[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: QK.departamentos,
    queryFn: () => estructuraPlanaApi.listDepartamentos(),
    staleTime: 5 * 60 * 1000,
  })
  const options: NameOption[] = (data ?? []).map((d) => ({ id: d.id, nombre: d.nombre }))
  return { options, isLoading }
}
