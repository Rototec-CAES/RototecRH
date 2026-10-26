import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { capacitacionesApi as cap } from '@/api/capacitaciones'
import type {
  PensumInput, ModuloInput, TemaInput, EvaluacionInput, UpdateEvaluacionInput, PreguntaInput, RespuestaInput,
  GenerarExamenInput, ReabrirInput, CargaMasivaPreguntasInput, PensumArbol, CrearDocumentoInput, CrearSalaInput,
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
  documentos: ['cap', 'documentos'] as const,
  salas: ['cap', 'salas'] as const,
  sala: (id: number) => ['cap', 'salas', id] as const,
  elegiblesSala: (idModulo: number) => ['cap', 'salas', 'elegibles', idModulo] as const,
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
/**
 * Guarda el orden nuevo de los módulos. Reordena el árbol en caché al instante (optimista) y lo
 * revierte si el backend falla.
 */
export function useReordenarModulos(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => cap.reordenarModulos(idPensum, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: QK.pensum(idPensum) })
      const previo = qc.getQueryData<PensumArbol>(QK.pensum(idPensum))
      if (previo) {
        const porId = new Map(previo.modulos.map((m) => [m.id, m]))
        const modulos = ids.flatMap((id, i) => {
          const m = porId.get(id)
          return m ? [{ ...m, orden: i + 1 }] : []
        })
        qc.setQueryData<PensumArbol>(QK.pensum(idPensum), { ...previo, modulos })
      }
      return { previo }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previo) qc.setQueryData(QK.pensum(idPensum), ctx.previo)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }),
  })
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
export function useCargarPreguntas(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idEvaluacion, input }: { idEvaluacion: number; input: CargaMasivaPreguntasInput }) => cap.cargarPreguntas(idEvaluacion, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
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

// ---------- Biblioteca de material ----------
export function useDocumentos(enabled = true) {
  return useQuery({ queryKey: QK.documentos, queryFn: () => cap.listDocumentos(), enabled })
}
/** Sube el archivo a R2 y lo registra en la biblioteca (y lo liga al módulo si viene `idModulo`). */
export function useSubirDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, nombre, descripcion, idModulo, onProgress }: {
      file: File; nombre: string; descripcion?: string; idModulo?: number; onProgress?: (pct: number) => void
    }) => {
      const subido = await cap.subirArchivo(file, onProgress)
      const input: CrearDocumentoInput = {
        nombre, descripcion, idModulo, nombreArchivo: file.name, tipoMime: file.type || undefined,
        tamano: file.size, url: subido.url, archivoKey: subido.key,
      }
      return cap.createDocumento(input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.documentos }); qc.invalidateQueries({ queryKey: QK.pensums }) },
  })
}
export function useUpdateDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; nombre?: string; descripcion?: string | null }) => cap.updateDocumento(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.documentos }); qc.invalidateQueries({ queryKey: QK.pensums }) },
  })
}
export function useDeleteDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cap.deleteDocumento(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.documentos }); qc.invalidateQueries({ queryKey: QK.pensums }) },
  })
}
export function useVincularDocumento(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idModulo, idDocumento }: { idModulo: number; idDocumento: number }) => cap.vincularDocumento(idModulo, idDocumento),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }); qc.invalidateQueries({ queryKey: QK.documentos }) },
  })
}
export function useDesvincularDocumento(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idModulo, idDocumento }: { idModulo: number; idDocumento: number }) => cap.desvincularDocumento(idModulo, idDocumento),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }); qc.invalidateQueries({ queryKey: QK.documentos }) },
  })
}

// ---------- Salas de examen ----------
export function useSalas() {
  return useQuery({ queryKey: QK.salas, queryFn: () => cap.listSalas() })
}
/** Detalle de la sala; mientras está abierta se refresca cada 4 s para ver el avance en vivo. */
export function useSala(id: number | undefined) {
  return useQuery({
    queryKey: QK.sala(id ?? 0),
    queryFn: () => cap.getSala(id as number),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.estado === 'ABIERTA' ? 4000 : false),
  })
}
export function useElegiblesSala(idModulo: number | undefined) {
  return useQuery({ queryKey: QK.elegiblesSala(idModulo ?? 0), queryFn: () => cap.elegiblesSala(idModulo as number), enabled: Boolean(idModulo) })
}
export function useCrearSala() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: CrearSalaInput) => cap.createSala(input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.salas }) })
}
export function useCerrarSala() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.cerrarSala(id), onSuccess: (s) => { qc.setQueryData(QK.sala(s.id), s); qc.invalidateQueries({ queryKey: QK.salas }) } })
}
export function useDesbloquearParticipante(idSala: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (idParticipante: number) => cap.desbloquearParticipante(idSala, idParticipante), onSuccess: (s) => qc.setQueryData(QK.sala(s.id), s) })
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
