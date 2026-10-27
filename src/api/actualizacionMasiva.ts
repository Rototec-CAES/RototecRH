import type {
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
  /** Re-valida y aplica todo en una sola transacción (400 si hay cualquier error). */
  async aplicar(filas: FilaActualizacionMasiva[]): Promise<ResultadoAplicarMasiva> {
    const { data } = await api.post<ResultadoAplicarMasiva>('/empleados/actualizacion-masiva/aplicar', { filas })
    return data
  },
}
