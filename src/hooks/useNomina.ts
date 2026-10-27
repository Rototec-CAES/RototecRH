import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nominaApi } from '@/api/nomina'
import type {
  DescuentoEmpleadoInput,
  DescuentoEmpleadoParche,
  GenerarPlanillaInput,
  LineaNominaParche,
  PeriodoPlanilla,
  PlanillaNomina,
} from '@/types/nomina'

const QK = {
  planilla: (p: PeriodoPlanilla) => ['nomina', 'planilla', p.empresaId, p.anio, p.mes, p.quincena] as const,
  propuesta: (p: PeriodoPlanilla) => ['nomina', 'propuesta', p.empresaId, p.anio, p.mes, p.quincena] as const,
  semanas: (id: number, idEmpleado: number) => ['nomina', 'semanas-he', id, idEmpleado] as const,
  parametros: ['nomina', 'parametros'] as const,
  descuentos: ['nomina', 'descuentos'] as const,
}

export function usePlanillaPeriodo(p: PeriodoPlanilla | null) {
  return useQuery({
    queryKey: p ? QK.planilla(p) : ['nomina', 'planilla', 'none'],
    queryFn: () => nominaApi.porPeriodo(p as PeriodoPlanilla),
    enabled: Boolean(p),
  })
}

export function usePropuestaPlanilla(p: PeriodoPlanilla | null) {
  return useQuery({
    queryKey: p ? QK.propuesta(p) : ['nomina', 'propuesta', 'none'],
    queryFn: () => nominaApi.propuesta(p as PeriodoPlanilla),
    enabled: Boolean(p),
  })
}

/** Deja en caché la planilla devuelta por una mutación y refresca la propuesta del período. */
function useGuardarPlanilla() {
  const qc = useQueryClient()
  return (planilla: PlanillaNomina) => {
    const p = { empresaId: planilla.empresaId, anio: planilla.anio, mes: planilla.mes, quincena: planilla.quincena }
    qc.setQueryData(QK.planilla(p), planilla)
    qc.invalidateQueries({ queryKey: ['nomina', 'propuesta'] })
  }
}

export function useGenerarPlanillaNomina() {
  const guardar = useGuardarPlanilla()
  return useMutation({
    mutationFn: (input: GenerarPlanillaInput) => nominaApi.generar(input),
    onSuccess: guardar,
  })
}

export function useActualizarLineaNomina() {
  const guardar = useGuardarPlanilla()
  return useMutation({
    mutationFn: (v: { id: number; idEmpleado: number; parche: LineaNominaParche }) =>
      nominaApi.actualizarLinea(v.id, v.idEmpleado, v.parche),
    onSuccess: guardar,
  })
}

export function useCerrarPlanillaNomina() {
  const guardar = useGuardarPlanilla()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => nominaApi.cerrar(id),
    onSuccess: (planilla) => {
      guardar(planilla)
      // El cierre baja el saldo de préstamos/embargos.
      qc.invalidateQueries({ queryKey: QK.descuentos })
    },
  })
}

export function useEliminarPlanillaNomina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => nominaApi.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nomina'] }),
  })
}

export function useSemanasHEPlanilla(id: number | null, idEmpleado: number | null) {
  return useQuery({
    queryKey: QK.semanas(id ?? 0, idEmpleado ?? 0),
    queryFn: () => nominaApi.semanasHE(id as number, idEmpleado as number),
    enabled: id !== null && idEmpleado !== null,
  })
}

export function useParametrosNomina() {
  return useQuery({ queryKey: QK.parametros, queryFn: () => nominaApi.parametros() })
}

export function useActualizarParametroNomina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { clave: string; valor: number }) => nominaApi.actualizarParametro(v.clave, v.valor),
    onSuccess: (data) => qc.setQueryData(QK.parametros, data),
  })
}

export function useDescuentosEmpleado(params: { empresaId?: number; activos?: boolean }) {
  return useQuery({
    queryKey: [...QK.descuentos, params.empresaId, params.activos] as const,
    queryFn: () => nominaApi.descuentos(params),
  })
}

export function useCrearDescuentoEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DescuentoEmpleadoInput) => nominaApi.crearDescuento(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.descuentos }),
  })
}

export function useActualizarDescuentoEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; parche: DescuentoEmpleadoParche }) => nominaApi.actualizarDescuento(v.id, v.parche),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.descuentos }),
  })
}
