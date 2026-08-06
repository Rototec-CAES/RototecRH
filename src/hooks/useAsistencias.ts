import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { asistenciasApi } from '@/api/asistencias'
import type { RegistroAsistenciaInput } from '@/types'

const QK = {
  periodo: (desde: string, hasta: string) =>
    ['asistencias', 'periodo', desde, hasta] as const,
  empleadoPeriodo: (id: string, desde: string, hasta: string) =>
    ['asistencias', 'empleado', id, desde, hasta] as const,
  verificacion: (desde: string, hasta: string) =>
    ['asistencias', 'verificacion', desde, hasta] as const,
  noMarcaron: (desde: string, hasta: string) =>
    ['asistencias', 'no-marcaron', desde, hasta] as const,
}

export function useAsistenciasPeriodo(desde: string, hasta: string) {
  return useQuery({
    queryKey: QK.periodo(desde, hasta),
    queryFn: () => asistenciasApi.listByPeriodo(desde, hasta),
  })
}

// Asistencia día a día del rango. Sale del mismo grano que el cálculo de horas extra (turnos de
// las 4 fuentes + biométrico + ausencias registradas), así que un día de vacaciones viene
// etiquetado como tal en vez de aparecer como "no vino".
export function useVerificacionAsistencias(fechaInicial: string, fechaFinal: string) {
  return useQuery({
    queryKey: QK.verificacion(fechaInicial, fechaFinal),
    queryFn: () => asistenciasApi.verificar(fechaInicial, fechaFinal),
  })
}

// Programados en el rango que no marcaron NI UNA vez (y sin ausencia que lo explique). El grano
// los deja fuera del cálculo, por eso van en su propia lista y no como filas de la tabla.
export function useNoMarcaron(fechaInicial: string, fechaFinal: string) {
  return useQuery({
    queryKey: QK.noMarcaron(fechaInicial, fechaFinal),
    queryFn: () => asistenciasApi.noMarcaron(fechaInicial, fechaFinal),
  })
}

export function useAsistenciasEmpleadoPeriodo(
  empleadoId: string | undefined,
  desde: string,
  hasta: string,
) {
  return useQuery({
    queryKey: QK.empleadoPeriodo(empleadoId ?? '', desde, hasta),
    queryFn: () =>
      asistenciasApi.listByEmpleadoPeriodo(empleadoId as string, desde, hasta),
    enabled: Boolean(empleadoId),
  })
}

export function useUpsertAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegistroAsistenciaInput) => asistenciasApi.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] })
    },
  })
}

export function useDeleteAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ empleadoId, fecha }: { empleadoId: string; fecha: string }) =>
      asistenciasApi.remove(empleadoId, fecha),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] })
    },
  })
}
