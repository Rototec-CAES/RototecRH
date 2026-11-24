import type {
  CatalogosMasivaInput,
  CatalogosMasivaResultado,
  EmpleadoSinBiometrico,
  FilaActualizacionMasiva,
  PlantillaActualizacionMasiva,
  ResultadoAplicarMasiva,
  ResultadoValidacionMasiva,
} from '@/types'
import { rrhhApi as api } from './client'

/**
 * Actualización masiva de empleados vía Excel (solo API real: la validación y el diff
 * contra los datos actuales viven en el backend).
 */
export const actualizacionMasivaApi = {
  /** Columnas editables y valores actuales de los empleados activos. */
  async plantilla(): Promise<PlantillaActualizacionMasiva> {
    const { data } = await api.get<PlantillaActualizacionMasiva>('/empleados/actualizacion-masiva/plantilla')
    return data
  },
  /** Devuelve, por fila, los cambios (anterior → nuevo) y los errores. No escribe nada. */
  async validar(filas: FilaActualizacionMasiva[]): Promise<ResultadoValidacionMasiva> {
    const { data } = await api.post<ResultadoValidacionMasiva>('/empleados/actualizacion-masiva/validar', { filas })
    return data
  },
  /** Crea los departamentos y puestos nuevos del Excel (una transacción) y devuelve sus IDs. */
  async catalogos(input: CatalogosMasivaInput): Promise<CatalogosMasivaResultado> {
    const { data } = await api.post<CatalogosMasivaResultado>('/empleados/actualizacion-masiva/catalogos', input)
    return data
  },
  /** Empleados activos que no están en el biométrico. */
  async sinBiometrico(): Promise<EmpleadoSinBiometrico[]> {
    const { data } = await api.get<EmpleadoSinBiometrico[]>('/empleados/sin-biometrico')
    return data
  },
  /** Registra en BioTime a un empleado existente y devuelve su código de biométrico. */
  async registrarBiometrico(
    id: number,
    body: { departamento_biotime: number; ubicacion_biometrico: number },
  ): Promise<{ id: number; codigoEmpleadoBio: number }> {
    const { data } = await api.post<{ id: number; codigoEmpleadoBio: number }>(`/empleados/${id}/biometrico`, body)
    return data
  },
  /** Vincula a un empleado con un registro que YA existe en BioTime (no crea otro allá). */
  async vincularBiometrico(id: number, codigoBio: number): Promise<{ id: number; codigoEmpleadoBio: number }> {
    const { data } = await api.post<{ id: number; codigoEmpleadoBio: number }>(`/empleados/${id}/vincular-biometrico`, {
      codigo_bio: codigoBio,
    })
    return data
  },
  /** Re-valida y aplica todo en una sola transacción (400 si hay cualquier error). */
  async aplicar(filas: FilaActualizacionMasiva[]): Promise<ResultadoAplicarMasiva> {
    const { data } = await api.post<ResultadoAplicarMasiva>('/empleados/actualizacion-masiva/aplicar', { filas })
    return data
  },
}
