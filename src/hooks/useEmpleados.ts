import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { empleadosApi } from '@/api/employees'
import { actualizacionMasivaApi } from '@/api/actualizacionMasiva'
import type {
  BajaInput,
  CreateEmpleadoInput,
  CreateEmpleadoResponse,
  EmpleadoInput,
  FilaActualizacionMasiva,
} from '@/types'

const QK = {
  all: ['empleados'] as const,
  one: (id: string) => ['empleados', id] as const,
}

export function useEmpleadosList() {
  return useQuery({
    queryKey: QK.all,
    queryFn: () => empleadosApi.list(),
  })
}

/** Lista de empleados con el shape del backend real (página de empleados migrada). */
export function useEmpleadosBackendList() {
  return useQuery({
    queryKey: [...QK.all, 'backend'] as const,
    queryFn: () => empleadosApi.listBackend(),
  })
}

/** Un empleado con el shape del backend real (detalle migrado). */
export function useEmpleadoBackend(id: string | undefined) {
  return useQuery({
    queryKey: [...QK.all, 'backend', id ?? ''] as const,
    queryFn: () => empleadosApi.getBackend(id as string),
    enabled: Boolean(id),
  })
}

export function useEmpleado(id: string | undefined) {
  return useQuery({
    queryKey: QK.one(id ?? ''),
    queryFn: () => empleadosApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmpleadoInput) => empleadosApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

/** Alta de empleado vía wizard (contrato snake_case → { id, codigoEmpleadoBio }). */
export function useCrearAltaEmpleado() {
  const qc = useQueryClient()
  return useMutation<CreateEmpleadoResponse, Error, CreateEmpleadoInput>({
    mutationFn: (input) => empleadosApi.crearAlta(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useUpdateEmpleado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmpleadoInput) => empleadosApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

/** Edición de empleado (PUT /empleados/:id con el contrato snake_case del backend). */
export function useActualizarEmpleado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CreateEmpleadoInput>) => empleadosApi.actualizar(id, input),
    onSuccess: (updated) => {
      qc.setQueryData([...QK.all, 'backend', id] as const, updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useDarDeBaja(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (baja: BajaInput) => empleadosApi.darDeBaja(id, baja),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useReactivar(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => empleadosApi.reactivar(id),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

// ───────── Actualización masiva (Excel) ─────────

/** Plantilla de actualización masiva (columnas + valores actuales de los activos). */
export function usePlantillaActualizacionMasiva() {
  return useQuery({
    queryKey: [...QK.all, 'actualizacion-masiva', 'plantilla'] as const,
    queryFn: () => actualizacionMasivaApi.plantilla(),
    staleTime: 0,
  })
}

export function useValidarActualizacionMasiva() {
  return useMutation({
    mutationFn: (filas: FilaActualizacionMasiva[]) => actualizacionMasivaApi.validar(filas),
  })
}

export function useAplicarActualizacionMasiva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filas: FilaActualizacionMasiva[]) => actualizacionMasivaApi.aplicar(filas),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}
