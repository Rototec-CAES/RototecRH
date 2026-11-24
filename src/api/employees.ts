import type {
  BajaInput,
  CreateEmpleadoInput,
  CreateEmpleadoResponse,
  Empleado,
  EmpleadoBackend,
  EmpleadoInput,
  HuellaBiotime,
} from '@/types'
import { rrhhApi as api, USE_MOCK } from './client'

const STORAGE_KEY = 'rototec.empleados.v2'

function readStore(): Empleado[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedIfEmpty()
    const parsed = JSON.parse(raw) as Empleado[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(data: Empleado[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function seedIfEmpty(): Empleado[] {
  const seed: Empleado[] = [
    {
      id: 'emp-0001',
      primerNombre: 'María',
      segundoNombre: 'Isabel',
      primerApellido: 'García',
      segundoApellido: 'López',
      tipoDocumento: 'DPI',
      dpi: '2845123450101',
      nit: '7654321',
      igss: '123456789',
      fechaNacimiento: '1990-04-12',
      sexo: 'F',
      estadoCivil: 'CASADO',
      cantidadHijos: 2,
      tipoDiscapacidad: '1',
      nacionalidad: 'GTM',
      paisOrigen: 'GTM',
      puebloPertenencia: '5',
      comunidadLinguistica: '1',
      lugarNacimientoMunicipio: 'Quetzaltenango',
      puesto: 'OPERARIO DE MAQUINA',
      departamento: 'PRODUCCION',
      jornada: 'DIURNA',
      temporalidadContrato: 'INDEFINIDO',
      tipoContrato: 'PLANILLA',
      fechaIngreso: '2022-03-01',
      salarioMensual: 3650,
      sucursal: 'KM 26.6 CARRETERA A EL SALVADOR',
      nivelAcademico: '7',
      tituloProfesion: 'Bachiller industrial',
      formaPago: 'TRANSFERENCIA',
      codigoBanco: '520',
      numeroCuenta: '1234567890',
      tipoCuenta: 'AHORRO',
      estado: 'ACTIVO',
    },
    {
      id: 'emp-0002',
      primerNombre: 'Juan',
      segundoNombre: 'Carlos',
      primerApellido: 'Pérez',
      segundoApellido: 'Méndez',
      tipoDocumento: 'DPI',
      dpi: '1957284610104',
      nit: '8123456K',
      igss: '987654321',
      fechaNacimiento: '1985-09-23',
      sexo: 'M',
      estadoCivil: 'SOLTERO',
      cantidadHijos: 0,
      tipoDiscapacidad: '1',
      nacionalidad: 'GTM',
      paisOrigen: 'GTM',
      puebloPertenencia: '5',
      comunidadLinguistica: '99',
      lugarNacimientoMunicipio: 'Guatemala',
      puesto: 'SUPERVISOR DE TURNO',
      departamento: 'PRODUCCION',
      jornada: 'NOCTURNA',
      temporalidadContrato: 'INDEFINIDO',
      tipoContrato: 'PLANILLA',
      fechaIngreso: '2019-06-15',
      salarioMensual: 5200,
      sucursal: 'KM 26.6 CARRETERA A EL SALVADOR',
      nivelAcademico: '9',
      tituloProfesion: 'Ingeniero industrial',
      formaPago: 'TRANSFERENCIA',
      codigoBanco: '618',
      numeroCuenta: '9988776655',
      tipoCuenta: 'MONETARIA',
      estado: 'ACTIVO',
    },
    {
      id: 'emp-0003',
      primerNombre: 'Ana',
      segundoNombre: 'Lucía',
      primerApellido: 'Hernández',
      tipoDocumento: 'DPI',
      dpi: '3056789120103',
      nit: '5544332',
      igss: '5566778',
      fechaNacimiento: '1995-11-30',
      sexo: 'F',
      estadoCivil: 'SOLTERO',
      cantidadHijos: 1,
      tipoDiscapacidad: '1',
      nacionalidad: 'GTM',
      paisOrigen: 'GTM',
      puebloPertenencia: '5',
      comunidadLinguistica: '99',
      puesto: 'AUXILIAR DE BODEGA',
      departamento: 'BODEGA',
      jornada: 'DIURNA',
      temporalidadContrato: 'INDEFINIDO',
      tipoContrato: 'PLANILLA',
      fechaIngreso: '2023-08-10',
      salarioMensual: 3650,
      sucursal: 'KM 26.6 CARRETERA A EL SALVADOR',
      nivelAcademico: '6',
      formaPago: 'CHEQUE',
      estado: 'BAJA',
      tipoBaja: 'RENUNCIA',
      fechaBaja: '2025-12-15',
      motivoBaja: 'Cambio de ciudad por motivos familiares',
    },
  ]
  writeStore(seed)
  return seed
}

function genId(): string {
  const all = readStore()
  const max = all
    .map((e) => Number(e.id.replace('emp-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `emp-${String(max + 1).padStart(4, '0')}`
}

// ---------- Mock impl ----------

const mockApi = {
  async huellas(): Promise<HuellaBiotime[]> {
    await delay()
    return []
  },
  async list(): Promise<Empleado[]> {
    await delay()
    return readStore()
  },
  // Lista con el shape del backend real (para la página de empleados migrada).
  async listBackend(): Promise<EmpleadoBackend[]> {
    await delay()
    return readStore() as unknown as EmpleadoBackend[]
  },
  async getBackend(id: string): Promise<EmpleadoBackend> {
    await delay()
    const found = (readStore() as unknown as EmpleadoBackend[]).find((e) => String(e.id) === String(id))
    if (!found) throw new Error('Empleado no encontrado')
    return found
  },
  async get(id: string): Promise<Empleado> {
    await delay()
    const found = readStore().find((e) => e.id === id)
    if (!found) throw new Error('Empleado no encontrado')
    return found
  },
  async create(input: EmpleadoInput): Promise<Empleado> {
    await delay()
    const all = readStore()
    const dpiDup = all.find((e) => e.dpi === input.dpi)
    if (dpiDup) throw new Error('Ya existe un empleado con ese DPI')
    const nuevo: Empleado = { ...input, id: genId(), estado: 'ACTIVO' }
    writeStore([nuevo, ...all])
    return nuevo
  },
  // Alta vía wizard (contrato nuevo snake_case). Stub en mock; el real pega a /rrhh/empleados.
  async crearAlta(_input: CreateEmpleadoInput): Promise<CreateEmpleadoResponse> {
    await delay()
    return { id: Date.now(), codigoEmpleadoBio: Math.floor(Math.random() * 900) + 100 }
  },
  async update(id: string, input: EmpleadoInput): Promise<Empleado> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Empleado no encontrado')
    const updated: Empleado = { ...all[idx], ...input }
    all[idx] = updated
    writeStore(all)
    return updated
  },
  async actualizar(id: string, _input: Partial<CreateEmpleadoInput>): Promise<EmpleadoBackend> {
    await delay()
    return { id: Number(id) } as EmpleadoBackend
  },
  async darDeBaja(id: string, baja: BajaInput): Promise<Empleado> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Empleado no encontrado')
    const updated: Empleado = { ...all[idx], estado: 'BAJA', ...baja }
    all[idx] = updated
    writeStore(all)
    return updated
  },
  async reactivar(id: string): Promise<Empleado> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Empleado no encontrado')
    const { tipoBaja, fechaBaja, motivoBaja, ...rest } = all[idx]
    void tipoBaja
    void fechaBaja
    void motivoBaja
    const updated: Empleado = { ...rest, estado: 'ACTIVO' }
    all[idx] = updated
    writeStore(all)
    return updated
  },
}

function delay(ms = 150) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- Real API impl ----------

const realApi = {
  /** Huellas registradas en ZKBioTime (cantidad, fecha y reloj) por código de biométrico. */
  async huellas(): Promise<HuellaBiotime[]> {
    const { data } = await api.get<HuellaBiotime[]>('/empleados/huellas')
    return data
  },
  async list(): Promise<Empleado[]> {
    const { data } = await api.get<Empleado[]>('/empleados')
    return data
  },
  async listBackend(): Promise<EmpleadoBackend[]> {
    const { data } = await api.get<EmpleadoBackend[]>('/empleados')
    return data
  },
  async getBackend(id: string): Promise<EmpleadoBackend> {
    const { data } = await api.get<EmpleadoBackend>(`/empleados/${id}`)
    return data
  },
  async get(id: string): Promise<Empleado> {
    const { data } = await api.get<Empleado>(`/empleados/${id}`)
    return data
  },
  async create(input: EmpleadoInput): Promise<Empleado> {
    const { data } = await api.post<Empleado>('/empleados', input)
    return data
  },
  async crearAlta(input: CreateEmpleadoInput): Promise<CreateEmpleadoResponse> {
    const { data } = await api.post<CreateEmpleadoResponse>('/empleados', input)
    return data
  },
  async update(id: string, input: EmpleadoInput): Promise<Empleado> {
    const { data } = await api.put<Empleado>(`/empleados/${id}`, input)
    return data
  },
  // Edición con el contrato snake_case del backend real (PUT /empleados/:id → empleado actualizado).
  async actualizar(id: string, input: Partial<CreateEmpleadoInput>): Promise<EmpleadoBackend> {
    const { data } = await api.put<EmpleadoBackend>(`/empleados/${id}`, input)
    return data
  },
  async darDeBaja(id: string, baja: BajaInput): Promise<Empleado> {
    const { data } = await api.post<Empleado>(`/empleados/${id}/baja`, baja)
    return data
  },
  async reactivar(id: string): Promise<Empleado> {
    const { data } = await api.post<Empleado>(`/empleados/${id}/reactivar`)
    return data
  },
}

export const empleadosApi = USE_MOCK ? mockApi : realApi
