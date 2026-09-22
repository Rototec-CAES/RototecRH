import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { capacitacionesApi as cap } from '@/api/capacitaciones'
import type {
  PensumInput, ModuloInput, TemaInput, EvaluacionInput, UpdateEvaluacionInput, PreguntaInput, RespuestaInput,
  GenerarExamenInput, ReabrirInput,
} from '@/types'

const QK = {
  pensums: ['cap', 'pensums'] as const,
  pensum: (id: number) => ['cap', 'pensums', id] as const,
  evaluacion: (idModulo: number) => ['cap', 'evaluacion', idModulo] as const,
  empleados: (f?: { puesto?: string; departamento?: string; estado?: string }) =>
    ['cap', 'empleados', f ?? {}] as const,
  empleado: (id: number) => ['cap', 'empleados', id] as const,
  elegibles: (f?: { puesto?: number; departamento?: number }) =>
    ['cap', 'elegibles', f ?? {}] as const,
}

// ---------- Pensums ----------
export function usePensums() {
  return useQuery({ queryKey: QK.pensums, queryFn: () => cap.listPensums() })
}
export function usePensumArbol(id: number | undefined) {
  return useQuery({ queryKey: QK.pensum(id ?? 0), queryFn: () => cap.getPensum(id as number), enabled: Boolean(id) })
}
export function useCreatePensum() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: PensumInput) => cap.createPensum(input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensums }) })
}
export function useUpdatePensum(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: PensumInput) => cap.updatePensum(id, input), onSuccess: () => { qc.invalidateQueries({ queryKey: QK.pensums }); qc.invalidateQueries({ queryKey: QK.pensum(id) }) } })
}
export function useDeletePensum() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deletePensum(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensums }) })
}

// ---------- Módulos / Temas (invalidan el árbol del pensum) ----------
export function useCreateModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: ModuloInput) => cap.createModulo(idPensum, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useUpdateModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: ModuloInput }) => cap.updateModulo(id, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useDeleteModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteModulo(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useCreateTema(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idModulo, input }: { idModulo: number; input: TemaInput }) => cap.createTema(idModulo, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useDeleteTema(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteTema(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}

// ---------- Evaluación ----------
export function useEvaluacion(idModulo: number | undefined) {
  return useQuery({ queryKey: QK.evaluacion(idModulo ?? 0), queryFn: () => cap.getEvaluacion(idModulo as number), enabled: Boolean(idModulo) })
}
export function useCreateEvaluacion(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: EvaluacionInput) => cap.createEvaluacion(input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useUpdateEvaluacion(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...input }: { id: number } & UpdateEvaluacionInput) => cap.updateEvaluacion(id, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useSubirVideoEvaluacion() {
  return useMutation({ mutationFn: ({ file, onProgress }: { file: File; onProgress?: (pct: number) => void }) => cap.subirVideo(file, onProgress) })
}
export function useDeleteEvaluacion(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteEvaluacion(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useCreatePregunta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idEvaluacion, input }: { idEvaluacion: number; input: PreguntaInput }) => cap.createPregunta(idEvaluacion, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useDeletePregunta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deletePregunta(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useCreateRespuesta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idPregunta, input }: { idPregunta: number; input: RespuestaInput }) => cap.createRespuesta(idPregunta, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useDeleteRespuesta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteRespuesta(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}

// ---------- Empleados / asignaciones / examen ----------
export function useEmpleadosCap(filtros?: { puesto?: string; departamento?: string; estado?: string }) {
  return useQuery({ queryKey: QK.empleados(filtros), queryFn: () => cap.listEmpleados(filtros) })
}
export function useEmpleadoCap(empleadoId: number | undefined) {
  return useQuery({ queryKey: QK.empleado(empleadoId ?? 0), queryFn: () => cap.getEmpleado(empleadoId as number), enabled: Boolean(empleadoId) })
}
export function useAsignarPrimaria() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (empleadoIds: number[]) => cap.asignarPrimaria(empleadoIds), onSuccess: () => qc.invalidateQueries({ queryKey: ['cap', 'empleados'] }) })
}
export function useAsignarSecundaria(empleadoId: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (idPensum: number) => cap.asignarSecundaria(empleadoId, idPensum), onSuccess: () => { qc.invalidateQueries({ queryKey: QK.empleado(empleadoId) }); qc.invalidateQueries({ queryKey: ['cap', 'empleados'] }) } })
}
export function useGenerarExamen() {
  return useMutation({ mutationFn: (input: GenerarExamenInput) => cap.generarExamen(input) })
}

// ---------- Elegibles ----------
export function useElegibles(filtros?: { puesto?: number; departamento?: number }) {
  return useQuery({ queryKey: QK.elegibles(filtros), queryFn: () => cap.listElegibles(filtros) })
}

// ---------- Evaluaciones por módulo (batch) ----------
export function useEvaluacionesDeModulos(idModulos: number[]): {
  tieneEvaluacion: (idModulo: number) => boolean | undefined
  isLoading: boolean
} {
  const results = useQueries({
    queries: idModulos.map((id) => ({
      queryKey: QK.evaluacion(id),
      queryFn: () => cap.getEvaluacion(id),
      enabled: id > 0,
    })),
  })

  const statusMap = new Map<number, boolean | undefined>()
  idModulos.forEach((id, i) => {
    const r = results[i]
    if (!r || r.isLoading) {
      statusMap.set(id, undefined)
    } else {
      statusMap.set(id, r.data != null)
    }
  })

  const isLoading = results.some((r) => r.isLoading)

  return {
    tieneEvaluacion: (id: number) => statusMap.get(id),
    isLoading,
  }
}

// ---------- Reabrir ----------
export function useReabrir(empleadoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idAsignacion, input }: { idAsignacion: number; input?: ReabrirInput }) =>
      cap.reabrir(idAsignacion, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.empleado(empleadoId) })
      qc.invalidateQueries({ queryKey: ['cap', 'empleados'] })
      qc.invalidateQueries({ queryKey: ['cap', 'elegibles'] })
    },
  })
}
