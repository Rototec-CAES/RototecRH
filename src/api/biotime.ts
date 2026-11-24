import { rrhhApi, USE_MOCK } from './client'
import type { BiotimeItem } from '@/types'

// Biotime devuelve el array crudo (departamentos: dept_name; áreas: area_name).
const mapBio = (r: Record<string, unknown>): BiotimeItem => ({
  id: Number(r.id ?? r.Id),
  nombre: String(r.dept_name ?? r.area_name ?? r.position_name ?? r.name ?? r.nombre ?? ''),
})

const realApi = {
  async departamentos(): Promise<BiotimeItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/biotime/departamentos')
    return data.map(mapBio)
  },
  async posiciones(): Promise<BiotimeItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/biotime/posiciones')
    return data.map(mapBio)
  },
  async ubicaciones(): Promise<BiotimeItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/biotime/ubicaciones')
    return data.map(mapBio)
  },
}

const mockApi: typeof realApi = {
  async departamentos() {
    return [
      { id: 1, nombre: 'PRODUCCION' },
      { id: 2, nombre: 'ADMIN' },
    ]
  },
  async posiciones() {
    return [
      { id: 7, nombre: 'Operario de Maquina' },
      { id: 8, nombre: 'Jefe de producción' },
    ]
  },
  async ubicaciones() {
    return [
      { id: 1, nombre: 'PLANTA EL SALVADOR' },
      { id: 2, nombre: 'CEDIS' },
    ]
  },
}

export const biotimeApi = USE_MOCK ? mockApi : realApi
