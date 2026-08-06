import { rrhhApi, USE_MOCK } from './client'
import type {
  AusenciaBackend,
  CreateAusenciaInput,
  CreateAusenciasRangoInput,
  CreateAusenciasRangoResult,
  TipoAusenciaCatalogo,
  UpdateAusenciaInput,
} from '@/types'

const realApi = {
  async tipos(): Promise<TipoAusenciaCatalogo[]> {
    const { data } = await rrhhApi.get<TipoAusenciaCatalogo[]>('/ausencias/tipos')
    return data
  },
  async listByPeriodo(desde: string, hasta: string): Promise<AusenciaBackend[]> {
    const { data } = await rrhhApi.get<AusenciaBackend[]>('/ausencias', { params: { desde, hasta } })
    return data
  },
  async listByEmpleado(idEmpleado: number): Promise<AusenciaBackend[]> {
    const { data } = await rrhhApi.get<AusenciaBackend[]>(`/ausencias/empleado/${idEmpleado}`)
    return data
  },
  async create(input: CreateAusenciaInput): Promise<AusenciaBackend> {
    const { data } = await rrhhApi.post<AusenciaBackend>('/ausencias', input)
    return data
  },
  async createRango(input: CreateAusenciasRangoInput): Promise<CreateAusenciasRangoResult> {
    const { data } = await rrhhApi.post<CreateAusenciasRangoResult>('/ausencias/rango', input)
    return data
  },
  async update(id: number, input: UpdateAusenciaInput): Promise<AusenciaBackend> {
    const { data } = await rrhhApi.put<AusenciaBackend>(`/ausencias/${id}`, input)
    return data
  },
  async remove(id: number): Promise<void> {
    await rrhhApi.delete(`/ausencias/${id}`)
  },
}

const mockApi: typeof realApi = {
  async tipos() {
    return []
  },
  async listByPeriodo() {
    return []
  },
  async listByEmpleado() {
    return []
  },
  async create(input) {
    return {
      id: Date.now(),
      tipoAusencia: input.tipoAusencia,
      idEmpleado: input.idEmpleado,
      fechaAusencia: input.fechaAusencia,
      fechaSolicitudPermiso: input.fechaSolicitudPermiso ?? null,
      comentarios: input.comentarios ?? null,
      medidaDisciplinaria: null,
      presentoConstancia: input.presentoConstancia ?? false,
      diasDescontados: 0,
      descontarSeptimo: false,
      pagaIGSS: false,
      fechaCreacion: null,
    }
  },
  async createRango() {
    return { creadas: [], omitidas: [], totalCreadas: 0, totalOmitidas: 0 }
  },
  async update() {
    throw new Error('mock no soportado')
  },
  async remove() {},
}

export const ausenciasBackendApi = USE_MOCK ? mockApi : realApi
