import type {
  AsistenciaNoMarco,
  RegistroAsistencia,
  RegistroAsistenciaInput,
  VerificacionAsistencia,
} from '@/types'
import { calcularHorasTrabajadasDeMarcaje } from '@/lib/asistencias'
import { rrhhApi as api, USE_MOCK } from './client'

const STORAGE_KEY = 'rototec.asistencias.v1'

function readStore(): RegistroAsistencia[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RegistroAsistencia[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(data: RegistroAsistencia[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function genId(): string {
  const all = readStore()
  const max = all
    .map((r) => Number(r.id.replace('asi-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `asi-${String(max + 1).padStart(6, '0')}`
}

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms))
}

function aplicarCalculo(input: RegistroAsistenciaInput): {
  horasTrabajadas: number
  horasComida: number
} {
  if (input.tipoRegistro !== 'MARCAJE') {
    return { horasTrabajadas: 0, horasComida: 0 }
  }
  const horasTrabajadas = calcularHorasTrabajadasDeMarcaje(
    input.horaEntradaReal,
    input.horaSalidaReal,
    Boolean(input.incluyeHoraAlmuerzo),
  )
  return {
    horasTrabajadas,
    horasComida: input.incluyeHoraAlmuerzo ? 1 : 0,
  }
}

// ---------- Mock ----------

const mockApi = {
  async list(): Promise<RegistroAsistencia[]> {
    await delay()
    return readStore()
  },
  async listByPeriodo(desde: string, hasta: string): Promise<RegistroAsistencia[]> {
    await delay()
    return readStore().filter((r) => r.fecha >= desde && r.fecha <= hasta)
  },
  async listByEmpleadoPeriodo(
    empleadoId: string,
    desde: string,
    hasta: string,
  ): Promise<RegistroAsistencia[]> {
    await delay()
    return readStore().filter(
      (r) => r.empleadoId === empleadoId && r.fecha >= desde && r.fecha <= hasta,
    )
  },
  // upsert por empleadoId+fecha: si existe, reemplaza; si no, crea
  async upsert(input: RegistroAsistenciaInput): Promise<RegistroAsistencia> {
    await delay()
    const all = readStore()
    const idx = all.findIndex(
      (r) => r.empleadoId === input.empleadoId && r.fecha === input.fecha,
    )
    const calc = aplicarCalculo(input)
    if (idx === -1) {
      const nuevo: RegistroAsistencia = {
        ...input,
        id: genId(),
        ...calc,
        fechaCreacion: new Date().toISOString(),
      }
      writeStore([nuevo, ...all])
      return nuevo
    }
    const updated: RegistroAsistencia = {
      ...all[idx],
      ...input,
      ...calc,
    }
    all[idx] = updated
    writeStore(all)
    return updated
  },
  async remove(empleadoId: string, fecha: string): Promise<void> {
    await delay()
    const all = readStore().filter(
      (r) => !(r.empleadoId === empleadoId && r.fecha === fecha),
    )
    writeStore(all)
  },
  async verificar(
    _fechaInicial: string,
    _fechaFinal: string,
  ): Promise<VerificacionAsistencia[]> {
    await delay()
    return []
  },
  async noMarcaron(
    _fechaInicial: string,
    _fechaFinal: string,
  ): Promise<AsistenciaNoMarco[]> {
    await delay()
    return []
  },
}

// ---------- Real API ----------

const realApi = {
  async list(): Promise<RegistroAsistencia[]> {
    const { data } = await api.get<RegistroAsistencia[]>('/asistencias')
    return data
  },
  async listByPeriodo(desde: string, hasta: string): Promise<RegistroAsistencia[]> {
    const { data } = await api.get<RegistroAsistencia[]>('/asistencias', {
      params: { desde, hasta },
    })
    return data
  },
  async listByEmpleadoPeriodo(
    empleadoId: string,
    desde: string,
    hasta: string,
  ): Promise<RegistroAsistencia[]> {
    const { data } = await api.get<RegistroAsistencia[]>(
      `/empleados/${empleadoId}/asistencias`,
      { params: { desde, hasta } },
    )
    return data
  },
  async upsert(input: RegistroAsistenciaInput): Promise<RegistroAsistencia> {
    const { data } = await api.post<RegistroAsistencia>('/asistencias', input)
    return data
  },
  async remove(empleadoId: string, fecha: string): Promise<void> {
    await api.delete(`/asistencias`, { params: { empleadoId, fecha } })
  },
  // GET /rrhh/asistencias/verificar?fechaInicial=YYYY-MM-DD&fechaFinal=YYYY-MM-DD
  async verificar(
    fechaInicial: string,
    fechaFinal: string,
  ): Promise<VerificacionAsistencia[]> {
    const { data } = await api.get<VerificacionAsistencia[]>(
      '/asistencias/verificar',
      { params: { fechaInicial, fechaFinal } },
    )
    return data
  },
  // GET /rrhh/asistencias/no-marcaron?fechaInicial=YYYY-MM-DD&fechaFinal=YYYY-MM-DD
  async noMarcaron(
    fechaInicial: string,
    fechaFinal: string,
  ): Promise<AsistenciaNoMarco[]> {
    const { data } = await api.get<AsistenciaNoMarco[]>('/asistencias/no-marcaron', {
      params: { fechaInicial, fechaFinal },
    })
    return data
  },
}

export const asistenciasApi = USE_MOCK ? mockApi : realApi
