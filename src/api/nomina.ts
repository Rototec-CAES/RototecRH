import type {
  DescuentoEmpleado,
  DescuentoEmpleadoInput,
  DescuentoEmpleadoParche,
  GenerarPlanillaInput,
  LineaNominaParche,
  ParametroNomina,
  PeriodoPlanilla,
  PlanillaNomina,
  PropuestaPlanilla,
  SemanaHEPlanilla,
} from '@/types/nomina'
import { rrhhApi as api } from './client'

// La planilla se calcula en el MS de RRHH (cruza turnos programados con el biométrico, ausencias,
// préstamos y parámetros guardados en BD). No tiene modo mock: necesita el backend real.
export const nominaApi = {
  async propuesta(p: PeriodoPlanilla): Promise<PropuestaPlanilla> {
    const { data } = await api.get<PropuestaPlanilla>('/planillas/propuesta', { params: p })
    return data
  },
  async porPeriodo(p: PeriodoPlanilla): Promise<PlanillaNomina | null> {
    const { data } = await api.get<PlanillaNomina | null>('/planillas/periodo', { params: p })
    return data ?? null
  },
  async generar(input: GenerarPlanillaInput): Promise<PlanillaNomina> {
    const { data } = await api.post<PlanillaNomina>('/planillas/generar', input)
    return data
  },
  async actualizarLinea(id: number, idEmpleado: number, parche: LineaNominaParche): Promise<PlanillaNomina> {
    const { data } = await api.patch<PlanillaNomina>(`/planillas/${id}/lineas/${idEmpleado}`, parche)
    return data
  },
  async cerrar(id: number): Promise<PlanillaNomina> {
    const { data } = await api.post<PlanillaNomina>(`/planillas/${id}/cerrar`)
    return data
  },
  async eliminar(id: number): Promise<void> {
    await api.delete(`/planillas/${id}`)
  },
  async semanasHE(id: number, idEmpleado: number): Promise<SemanaHEPlanilla[]> {
    const { data } = await api.get<SemanaHEPlanilla[]>(`/planillas/${id}/horas-extra/${idEmpleado}`)
    return data
  },
  async parametros(): Promise<ParametroNomina[]> {
    const { data } = await api.get<ParametroNomina[]>('/planillas/parametros')
    return data
  },
  async actualizarParametro(clave: string, valor: number): Promise<ParametroNomina[]> {
    const { data } = await api.put<ParametroNomina[]>(`/planillas/parametros/${clave}`, { valor })
    return data
  },
  async descuentos(params: { empresaId?: number; idEmpleado?: number; activos?: boolean }): Promise<DescuentoEmpleado[]> {
    const { data } = await api.get<DescuentoEmpleado[]>('/descuentos-empleado', {
      params: {
        empresaId: params.empresaId,
        idEmpleado: params.idEmpleado,
        activos: params.activos === undefined ? undefined : String(params.activos),
      },
    })
    return data
  },
  async crearDescuento(input: DescuentoEmpleadoInput): Promise<DescuentoEmpleado> {
    const { data } = await api.post<DescuentoEmpleado>('/descuentos-empleado', input)
    return data
  },
  async actualizarDescuento(id: number, parche: DescuentoEmpleadoParche): Promise<DescuentoEmpleado> {
    const { data } = await api.put<DescuentoEmpleado>(`/descuentos-empleado/${id}`, parche)
    return data
  },
}
