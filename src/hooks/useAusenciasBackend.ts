import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ausenciasBackendApi } from '@/api/ausenciasBackend'
import type { CreateAusenciaInput, CreateAusenciasRangoInput, UpdateAusenciaInput } from '@/types'

const HORA = 1000 * 60 * 60
const QK = {
  all: ['ausencias-bk'] as const,
  periodo: (desde: string, hasta: string) => ['ausencias-bk', 'periodo', desde, hasta] as const,
  empleado: (id: number) => ['ausencias-bk', 'empleado', id] as const,
  tipos: ['ausencias-bk', 'tipos'] as const,
}

export const useTiposAusencia = () =>
  useQuery({ queryKey: QK.tipos, queryFn: () => ausenciasBackendApi.tipos(), staleTime: HORA })

export const useAusenciasPeriodoBackend = (desde: string, hasta: string) =>
  useQuery({
    queryKey: QK.periodo(desde, hasta),
    queryFn: () => ausenciasBackendApi.listByPeriodo(desde, hasta),
  })

export const useAusenciasByEmpleadoBackend = (idEmpleado?: number) =>
  useQuery({
    queryKey: QK.empleado(idEmpleado ?? 0),
    queryFn: () => ausenciasBackendApi.listByEmpleado(idEmpleado as number),
    enabled: Boolean(idEmpleado),
  })

export function useCrearAusencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAusenciaInput) => ausenciasBackendApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  })
}

/** Alta de varios días de una sola vez (vacaciones, suspensiones). Omite los días ya registrados. */
export function useCrearAusenciasRango() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAusenciasRangoInput) => ausenciasBackendApi.createRango(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  })
}

export function useActualizarAusencia(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAusenciaInput) => ausenciasBackendApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  })
}

export function useEliminarAusencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ausenciasBackendApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.all }),
  })
}
