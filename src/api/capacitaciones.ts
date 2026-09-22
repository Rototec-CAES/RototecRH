import {
  api as gatewayApi,
  rrhhApi as api,
  rrhhPublicApi as publicApi,
  USE_MOCK,
} from './client'
import type {
  Pensum, PensumArbol, PensumInput, ModuloInput, TemaInput,
  PensumModuloArbol, PensumTemaArbol,
  Evaluacion, EvaluacionDetalle, EvaluacionInput, UpdateEvaluacionInput, ArchivoSubido,
  Pregunta, PreguntaInput, Respuesta, RespuestaInput,
  EmpleadoCapResumen, EmpleadoCapDetalle,
  GenerarExamenInput, GenerarExamenResult,
  ExamenPublico, EnviarRespuestasInput, ResultadoExamen, EstadoModulo,
  EmpleadoCapElegible, ReabrirInput, ReabrirResult,
  AsignacionCap, AsignacionDetalleCap,
} from '@/types'

// ============ Storage (mock) ============
const K = {
  pensums: 'rototec.cap.pensums.v1',
  modulos: 'rototec.cap.modulos.v1',
  temas: 'rototec.cap.temas.v1',
  evals: 'rototec.cap.evaluaciones.v1',
  preguntas: 'rototec.cap.preguntas.v1',
  respuestas: 'rototec.cap.respuestas.v1',
  empleados: 'rototec.cap.empleados.v1',
  tokens: 'rototec.cap.tokens.v1',
  asignaciones: 'rototec.cap.asignaciones.v1',
}
function read<T>(key: string, seed: () => T[] = () => []): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) { const s = seed(); if (s.length) window.localStorage.setItem(key, JSON.stringify(s)); return s }
    const p = JSON.parse(raw) as T[]
    return Array.isArray(p) ? p : []
  } catch { return [] }
}
function write<T>(key: string, data: T[]) { window.localStorage.setItem(key, JSON.stringify(data)) }
function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
}
function delay(ms = 120) { return new Promise((r) => setTimeout(r, ms)) }

/** Alias del bucket R2 (cloudflare-service-layer) donde viven los videos de evaluación. */
const BUCKET_VIDEOS = 'capacitaciones'
/** Evaluaciones guardadas antes del modo VIDEO no traen modo/video. */
function normalizarEvaluacion(ev: Partial<Evaluacion> & Pick<Evaluacion, 'id' | 'idModulo' | 'nombre'>): Evaluacion {
  return { modo: 'EXAMEN', videoUrl: null, videoKey: null, ...ev }
}

// Mock raw rows
interface ModuloRow extends ModuloInput { id: number; idPensum: number }
interface TemaRow extends TemaInput { id: number; idModulo: number }

// Seed empleados (raw — not EmpleadoCapResumen, that is derived)
interface EmpleadoRaw {
  empleadoId: number
  nombre: string
  idPuesto: number
  idDepartamento: number
  estaActivo: boolean
}

// AsignacionRow = header stored in rototec.cap.asignaciones.v1
interface AsignacionRow {
  id: number
  empleadoId: number
  idPensum: number
  tipo: 'primaria' | 'secundaria'
  licenciaActiva: boolean
  venceLicencia: string | null
  fechaFinaliza: string | null
  detalles: AsignacionDetalleCap[]
}

function seedPensums(): Pensum[] {
  return [{ id: 1, nombre: 'Inducción Operario', puesto: 'Operario', idPuesto: 1 }]
}
function seedModulos(): ModuloRow[] {
  return [
    { id: 1, idPensum: 1, modulo: 'Seguridad básica', objetivo: 'Conocer EPP', porcentajeAprobacion: 70, bono: false },
    { id: 2, idPensum: 1, modulo: 'Manejo de maquinaria', objetivo: 'Operar con seguridad', porcentajeAprobacion: 75, bono: false },
    { id: 3, idPensum: 1, modulo: 'Calidad e inocuidad', objetivo: 'Estándares de calidad', porcentajeAprobacion: 70, bono: false },
  ]
}
function seedEmpleadosRaw(): EmpleadoRaw[] {
  return [
    { empleadoId: 1, nombre: 'María García', idPuesto: 1, idDepartamento: 1, estaActivo: true },
    { empleadoId: 2, nombre: 'Juan Carlos Pérez', idPuesto: 1, idDepartamento: 1, estaActivo: true },
    { empleadoId: 3, nombre: 'Ana Lucía Hernández', idPuesto: 2, idDepartamento: 2, estaActivo: false },
    { empleadoId: 4, nombre: 'Roberto Morales', idPuesto: 1, idDepartamento: 1, estaActivo: true },
    { empleadoId: 5, nombre: 'Lucia Ajú Choc', idPuesto: 1, idDepartamento: 1, estaActivo: true },
  ]
}
function seedAsignaciones(): AsignacionRow[] {
  // empleadoId=1 asignado: módulos mixtos (2 Aprobado, 1 Pendiente)
  // empleadoId=4 asignado: todos Aprobado (para diploma)
  // empleadoId=2 y 5: elegibles (sin asignación primaria)
  return [
    {
      id: 1, empleadoId: 1, idPensum: 1, tipo: 'primaria', licenciaActiva: false,
      venceLicencia: null, fechaFinaliza: null,
      detalles: [
        { id: 101, idModulo: 1, puntuacion: 85, estado: 'Aprobado', intentos: 1 },
        { id: 102, idModulo: 2, puntuacion: 90, estado: 'Aprobado', intentos: 2 },
        { id: 103, idModulo: 3, puntuacion: null, estado: 'Pendiente', intentos: 0 },
      ],
    },
    {
      id: 2, empleadoId: 4, idPensum: 1, tipo: 'primaria', licenciaActiva: true,
      venceLicencia: '2027-06-01', fechaFinaliza: '2026-05-15',
      detalles: [
        { id: 201, idModulo: 1, puntuacion: 95, estado: 'Aprobado', intentos: 1 },
        { id: 202, idModulo: 2, puntuacion: 88, estado: 'Aprobado', intentos: 1 },
        { id: 203, idModulo: 3, puntuacion: 92, estado: 'Aprobado', intentos: 1 },
      ],
    },
  ]
}

// ============ Mock helpers to build trees ============
function buildPensumArbol(p: Pensum): PensumArbol {
  const modulos = read<ModuloRow>(K.modulos, seedModulos).filter((m) => m.idPensum === p.id)
  const temas = read<TemaRow>(K.temas)
  const modulosArbol: PensumModuloArbol[] = modulos.map((m) => ({
    id: m.id, modulo: m.modulo, objetivo: m.objetivo ?? null,
    duracionHoras: m.duracionHoras ?? null, capacitador: m.capacitador ?? null,
    tipoEvaluacion: m.tipoEvaluacion ?? null, instrumentos: m.instrumentos ?? null,
    porcentajeAprobacion: m.porcentajeAprobacion ?? null, vigencia: m.vigencia ?? null,
    bono: m.bono ?? null,
    temas: temas.filter((t) => t.idModulo === m.id).map<PensumTemaArbol>((t) => ({
      id: t.id, tema: t.tema ?? null, modalidad: t.modalidad ?? null, recursos: t.recursos ?? null,
    })),
  }))
  return { id: p.id, nombre: p.nombre, puesto: p.puesto, idPuesto: p.idPuesto, modulos: modulosArbol }
}

/** Recompute licenciaActiva for a header: all detalles Aprobado */
function recomputeLicencia(header: AsignacionRow): void {
  if (header.detalles.length > 0 && header.detalles.every((d) => d.estado === 'Aprobado')) {
    header.licenciaActiva = true
  } else {
    header.licenciaActiva = false
    header.venceLicencia = null
  }
}

/** Build EmpleadoCapResumen from raw+asignaciones stores */
// Seed name maps for mock — kept in sync with seedEmpleadosRaw idPuesto/idDepartamento values
const SEED_PUESTO_NOMBRES: Record<number, string> = { 1: 'Operario', 2: 'Administrativo' }

function buildResumen(emp: EmpleadoRaw, asigs: AsignacionRow[], pensums?: Pensum[]): EmpleadoCapResumen {
  const empAsigs = asigs.filter((a) => a.empleadoId === emp.empleadoId)
  const allDetalles = empAsigs.flatMap((a) => a.detalles)
  const licenciaActiva = empAsigs.some((a) => a.licenciaActiva)
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const licenciaEstado: 'activa' | 'expirada' | 'sin_licencia' = empAsigs.some(
    (a) => a.venceLicencia !== null && new Date(a.venceLicencia) >= hoy
  ) ? 'activa' : empAsigs.some(
    (a) => a.venceLicencia !== null && new Date(a.venceLicencia) < hoy
  ) ? 'expirada' : 'sin_licencia'
  const primaAsig = empAsigs.find((a) => a.tipo === 'primaria')
  const capacitacionNombre = pensums && primaAsig
    ? (pensums.find((p) => p.id === primaAsig.idPensum)?.nombre ?? null)
    : null
  return {
    empleadoId: emp.empleadoId,
    nombre: emp.nombre,
    idPuesto: emp.idPuesto,
    idDepartamento: emp.idDepartamento,
    estaActivo: emp.estaActivo,
    modulosTotal: allDetalles.length,
    modulosAprobados: allDetalles.filter((d) => d.estado === 'Aprobado').length,
    licenciaActiva,
    licenciaEstado,
    puestoNombre: SEED_PUESTO_NOMBRES[emp.idPuesto] ?? null,
    capacitacionNombre,
  }
}

// ============ MOCK API ============
const mockApi = {
  // -- Pensums --
  async listPensums(): Promise<Pensum[]> { await delay(); return read<Pensum>(K.pensums, seedPensums) },
  async getPensum(id: number): Promise<PensumArbol> {
    await delay()
    const p = read<Pensum>(K.pensums, seedPensums).find((x) => x.id === id)
    if (!p) throw new Error('Pensum no encontrado')
    return buildPensumArbol(p)
  },
  async createPensum(input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const nuevo: Pensum = { id: nextId(rows), nombre: input.nombre, puesto: input.puesto ?? null, idPuesto: input.idPuesto ?? null }
    write(K.pensums, [nuevo, ...rows]); return nuevo
  },
  async updatePensum(id: number, input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Pensum no encontrado')
    rows[i] = { ...rows[i], nombre: input.nombre, puesto: input.puesto ?? rows[i].puesto, idPuesto: input.idPuesto ?? rows[i].idPuesto }
    write(K.pensums, rows); return rows[i]
  },
  async deletePensum(id: number): Promise<{ id: number }> {
    await delay(); write(K.pensums, read<Pensum>(K.pensums, seedPensums).filter((x) => x.id !== id)); return { id }
  },
  // -- Módulos --
  async createModulo(idPensum: number, input: ModuloInput): Promise<PensumModuloArbol> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const row: ModuloRow = { ...input, id: nextId(rows), idPensum }
    write(K.modulos, [...rows, row])
    return { id: row.id, modulo: row.modulo, objetivo: row.objetivo ?? null, duracionHoras: row.duracionHoras ?? null, capacitador: row.capacitador ?? null, tipoEvaluacion: row.tipoEvaluacion ?? null, instrumentos: row.instrumentos ?? null, porcentajeAprobacion: row.porcentajeAprobacion ?? null, vigencia: row.vigencia ?? null, bono: row.bono ?? null, temas: [] }
  },
  async updateModulo(id: number, input: ModuloInput): Promise<{ id: number }> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Módulo no encontrado')
    rows[i] = { ...rows[i], ...input }; write(K.modulos, rows); return { id }
  },
  async deleteModulo(id: number): Promise<{ id: number }> {
    await delay(); write(K.modulos, read<ModuloRow>(K.modulos, seedModulos).filter((x) => x.id !== id)); return { id }
  },
  // -- Temas --
  async createTema(idModulo: number, input: TemaInput): Promise<PensumTemaArbol> {
    await delay()
    const rows = read<TemaRow>(K.temas)
    const row: TemaRow = { ...input, id: nextId(rows), idModulo }
    write(K.temas, [...rows, row])
    return { id: row.id, tema: row.tema ?? null, modalidad: row.modalidad ?? null, recursos: row.recursos ?? null }
  },
  async deleteTema(id: number): Promise<{ id: number }> {
    await delay(); write(K.temas, read<TemaRow>(K.temas).filter((x) => x.id !== id)); return { id }
  },
  // -- Evaluación / preguntas / respuestas --
  async getEvaluacion(idModulo: number): Promise<EvaluacionDetalle | null> {
    await delay()
    const raw = read<Evaluacion>(K.evals).find((e) => e.idModulo === idModulo)
    if (!raw) return null
    const ev = normalizarEvaluacion(raw)
    const preguntas = read<Pregunta>(K.preguntas).filter((p) => p.idEvaluacion === ev.id)
    const resp = read<Respuesta>(K.respuestas)
    return { evaluacion: ev, preguntas: preguntas.map((p) => ({ ...p, respuestas: resp.filter((r) => r.idPregunta === p.id) })) }
  },
  async createEvaluacion(input: EvaluacionInput): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals)
    const ev: Evaluacion = { id: nextId(rows), idModulo: input.idModulo, nombre: input.nombre ?? null, modo: 'EXAMEN', videoUrl: null, videoKey: null }
    write(K.evals, [...rows, ev]); return ev
  },
  async updateEvaluacion(id: number, input: UpdateEvaluacionInput): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals); const i = rows.findIndex((e) => e.id === id)
    if (i === -1) throw new Error('Evaluación no encontrada')
    const cambios = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
    rows[i] = { ...normalizarEvaluacion(rows[i]), ...cambios }; write(K.evals, rows); return rows[i]
  },
  /** Mock: no sube nada; usa un blob URL local (válido solo mientras la pestaña que lo creó siga abierta). */
  async subirVideo(file: File, onProgress?: (pct: number) => void): Promise<ArchivoSubido> {
    for (const pct of [25, 50, 75, 100]) { await delay(150); onProgress?.(pct) }
    return { key: `${file.name}-${Date.now().toString(36)}`, url: URL.createObjectURL(file) }
  },
  async deleteEvaluacion(id: number): Promise<{ id: number }> {
    await delay(); write(K.evals, read<Evaluacion>(K.evals).filter((e) => e.id !== id)); return { id }
  },
  async createPregunta(idEvaluacion: number, input: PreguntaInput): Promise<Pregunta> {
    await delay()
    const rows = read<Pregunta>(K.preguntas)
    const p: Pregunta = { id: nextId(rows), idEvaluacion, pregunta: input.pregunta, puntosPorRespuesta: input.puntosPorRespuesta ?? null, idTema: input.idTema ?? null, respuestas: [] }
    write(K.preguntas, [...rows, p]); return p
  },
  async deletePregunta(id: number): Promise<{ id: number }> {
    await delay(); write(K.preguntas, read<Pregunta>(K.preguntas).filter((p) => p.id !== id)); return { id }
  },
  async createRespuesta(idPregunta: number, input: RespuestaInput): Promise<Respuesta> {
    await delay()
    const rows = read<Respuesta>(K.respuestas)
    const r: Respuesta = { id: nextId(rows), idPregunta, respuesta: input.respuesta, respuestaCorrecta: input.respuestaCorrecta ?? false }
    write(K.respuestas, [...rows, r]); return r
  },
  async deleteRespuesta(id: number): Promise<{ id: number }> {
    await delay(); write(K.respuestas, read<Respuesta>(K.respuestas).filter((r) => r.id !== id)); return { id }
  },

  // -- Elegibles --
  async listElegibles(filtros?: { puesto?: number; departamento?: number }): Promise<EmpleadoCapElegible[]> {
    await delay()
    const emps = read<EmpleadoRaw>(K.empleados, seedEmpleadosRaw)
    const pensums = read<Pensum>(K.pensums, seedPensums)
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    // Set of empleadoIds that already have a primaria assignment
    const withPrimaria = new Set(asigs.filter((a) => a.tipo === 'primaria').map((a) => a.empleadoId))
    // idPuestos with a pensum
    const puestosConPensum = new Set(pensums.map((p) => p.idPuesto).filter((id): id is number => id !== null))

    return emps
      .filter((e) => {
        if (!e.estaActivo) return false
        if (!puestosConPensum.has(e.idPuesto)) return false
        if (withPrimaria.has(e.empleadoId)) return false
        if (filtros?.puesto !== undefined && e.idPuesto !== filtros.puesto) return false
        if (filtros?.departamento !== undefined && e.idDepartamento !== filtros.departamento) return false
        return true
      })
      .map((e) => {
        const pensum = pensums.find((p) => p.idPuesto === e.idPuesto)!
        return {
          empleadoId: e.empleadoId,
          nombre: e.nombre,
          idPuesto: e.idPuesto,
          idPensum: pensum.id,
          puestoNombre: SEED_PUESTO_NOMBRES[e.idPuesto] ?? null,
          pensumNombre: pensum.nombre,
        }
      })
  },

  // -- Asignaciones --
  async asignarPrimaria(empleadoIds: number[]): Promise<{ ok: true }> {
    await delay()
    const pensums = read<Pensum>(K.pensums, seedPensums)
    const modulos = read<ModuloRow>(K.modulos, seedModulos)
    const emps = read<EmpleadoRaw>(K.empleados, seedEmpleadosRaw)
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    let nextAsigId = asigs.reduce((m, a) => Math.max(m, a.id), 0) + 1
    let nextDetalleId = asigs.flatMap((a) => a.detalles).reduce((m, d) => Math.max(m, d.id), 0) + 1

    for (const empId of empleadoIds) {
      const emp = emps.find((e) => e.empleadoId === empId)
      if (!emp) continue
      const pensum = pensums.find((p) => p.idPuesto === emp.idPuesto)
      if (!pensum) continue
      const pensumModulos = modulos.filter((m) => m.idPensum === pensum.id)
      const detalles: AsignacionDetalleCap[] = pensumModulos.map((m) => ({
        id: nextDetalleId++,
        idModulo: m.id,
        puntuacion: null,
        estado: 'Pendiente',
        intentos: 0,
      }))
      asigs.push({
        id: nextAsigId++,
        empleadoId: empId,
        idPensum: pensum.id,
        tipo: 'primaria',
        licenciaActiva: false,
        venceLicencia: null,
        fechaFinaliza: null,
        detalles,
      })
    }
    write(K.asignaciones, asigs)
    return { ok: true }
  },

  async asignarSecundaria(empleadoId: number, idPensum: number): Promise<{ ok: true }> {
    await delay()
    const modulos = read<ModuloRow>(K.modulos, seedModulos)
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    const nextAsigId = asigs.reduce((m, a) => Math.max(m, a.id), 0) + 1
    let nextDetalleId = asigs.flatMap((a) => a.detalles).reduce((m, d) => Math.max(m, d.id), 0) + 1
    const pensumModulos = modulos.filter((m) => m.idPensum === idPensum)
    const detalles: AsignacionDetalleCap[] = pensumModulos.map((m) => ({
      id: nextDetalleId++,
      idModulo: m.id,
      puntuacion: null,
      estado: 'Pendiente',
      intentos: 0,
    }))
    asigs.push({
      id: nextAsigId,
      empleadoId,
      idPensum,
      tipo: 'secundaria',
      licenciaActiva: false,
      venceLicencia: null,
      fechaFinaliza: null,
      detalles,
    })
    write(K.asignaciones, asigs)
    return { ok: true }
  },

  // -- Reabrir --
  async reabrir(idAsignacion: number, input?: ReabrirInput): Promise<ReabrirResult> {
    await delay()
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    const idx = asigs.findIndex((a) => a.id === idAsignacion)
    if (idx === -1) throw new Error('Asignación no encontrada')
    const header = asigs[idx]
    const idModulosSet = input?.idModulos ? new Set(input.idModulos) : null
    let reseteados = 0
    header.detalles = header.detalles.map((d) => {
      if (idModulosSet === null || idModulosSet.has(d.idModulo)) {
        reseteados++
        return { ...d, estado: 'Pendiente', puntuacion: null, intentos: 0 }
      }
      return d
    })
    recomputeLicencia(header)
    write(K.asignaciones, asigs)
    return {
      asignacionId: idAsignacion,
      reseteados,
      licenciaActiva: header.licenciaActiva,
      venceLicencia: header.venceLicencia,
    }
  },

  // -- Empleados --
  async listEmpleados(filtros?: { puesto?: string; departamento?: string; estado?: string }): Promise<EmpleadoCapResumen[]> {
    await delay()
    const emps = read<EmpleadoRaw>(K.empleados, seedEmpleadosRaw)
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    const pensums = read<Pensum>(K.pensums, seedPensums)
    const withAsig = new Set(asigs.map((a) => a.empleadoId))
    return emps
      .filter((e) => {
        if (!withAsig.has(e.empleadoId)) return false
        if (filtros?.estado === 'activo' && !e.estaActivo) return false
        if (filtros?.estado === 'inactivo' && e.estaActivo) return false
        return true
      })
      .map((e) => buildResumen(e, asigs, pensums))
  },

  async getEmpleado(empleadoId: number): Promise<EmpleadoCapDetalle> {
    await delay()
    const asigs = read<AsignacionRow>(K.asignaciones, seedAsignaciones)
    const empAsigs: AsignacionCap[] = asigs
      .filter((a) => a.empleadoId === empleadoId)
      .map((a) => ({
        id: a.id,
        idPensum: a.idPensum,
        tipo: a.tipo,
        licenciaActiva: a.licenciaActiva,
        venceLicencia: a.venceLicencia,
        fechaFinaliza: a.fechaFinaliza,
        detalles: a.detalles,
      }))
    return { empleadoId, asignaciones: empAsigs }
  },

  // -- Examen (admin genera) --
  async generarExamen(input: GenerarExamenInput): Promise<GenerarExamenResult> {
    await delay()
    const token = `tok-${input.idAsignacionDetalle}-${Date.now().toString(36)}`
    return { token, url: `${window.location.origin}/examen/${token}` }
  },
  // -- Examen público --
  async getExamenPublico(token: string): Promise<ExamenPublico> {
    await delay()
    // El token mock lleva el idAsignacionDetalle (tok-<id>-…) → resolvemos la evaluación real del módulo.
    const idDetalle = Number(token.split('-')[1])
    const detalle = read<AsignacionRow>(K.asignaciones, seedAsignaciones).flatMap((a) => a.detalles).find((d) => d.id === idDetalle)
    const raw = detalle ? read<Evaluacion>(K.evals).find((e) => e.idModulo === detalle.idModulo) : undefined
    const ev = raw ? normalizarEvaluacion(raw) : undefined
    if (ev?.modo === 'VIDEO') {
      return { idEvaluacion: ev.id, nombre: ev.nombre, modo: 'VIDEO', videoUrl: ev.videoUrl, preguntas: [] }
    }
    return { idEvaluacion: 1, nombre: 'Examen de prueba (mock)', modo: 'EXAMEN', videoUrl: null, preguntas: [
      { idPregunta: 1, pregunta: '¿Qué es EPP?', puntos: 50, opciones: [
        { idRespuesta: 1, respuesta: 'Equipo de protección personal' },
        { idRespuesta: 2, respuesta: 'Examen previo de planta' },
      ] },
    ] }
  },
  async enviarExamen(token: string, input: EnviarRespuestasInput): Promise<ResultadoExamen> {
    await delay(); void token
    if ('videoCompletado' in input) return { puntaje: 100, aprobado: true, estado: 'Aprobado' }
    const correctas = input.respuestas.filter((r) => r.idRespuesta === 1).length
    const puntaje = correctas * 50
    const estado: EstadoModulo = puntaje >= 70 ? 'Aprobado' : 'No aprobado'
    return { puntaje, aprobado: estado === 'Aprobado', estado }
  },
}

// ============ REAL API ============
const realApi: typeof mockApi = {
  async listPensums() { const { data } = await api.get<Pensum[]>('/capacitaciones/pensums'); return data },
  async getPensum(id) { const { data } = await api.get<PensumArbol>(`/capacitaciones/pensums/${id}`); return data },
  async createPensum(input) { const { data } = await api.post<Pensum>('/capacitaciones/pensums', input); return data },
  async updatePensum(id, input) { const { data } = await api.put<Pensum>(`/capacitaciones/pensums/${id}`, input); return data },
  async deletePensum(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/${id}`); return data },
  async createModulo(idPensum, input) { const { data } = await api.post<PensumModuloArbol>(`/capacitaciones/pensums/${idPensum}/modulos`, input); return data },
  async updateModulo(id, input) { const { data } = await api.put<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`, input); return data },
  async deleteModulo(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`); return data },
  async createTema(idModulo, input) { const { data } = await api.post<PensumTemaArbol>(`/capacitaciones/pensums/modulos/${idModulo}/temas`, input); return data },
  async deleteTema(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/temas/${id}`); return data },
  async getEvaluacion(idModulo) { const { data } = await api.get<EvaluacionDetalle | null>(`/capacitaciones/modulos/${idModulo}/evaluacion`); return data },
  async createEvaluacion(input) { const { data } = await api.post<Evaluacion>('/capacitaciones/evaluaciones', input); return data },
  async updateEvaluacion(id, input) { const { data } = await api.put<Evaluacion>(`/capacitaciones/evaluaciones/${id}`, input); return data },
  async subirVideo(file, onProgress) {
    const form = new FormData()
    form.append('file', file)
    // El gateway rutea /cloudflare → cloudflare-service-layer, que responde { ok, message, data }.
    const { data } = await gatewayApi.post<{ data: ArchivoSubido }>('/cloudflare/r2', form, {
      params: { bucket: BUCKET_VIDEOS },
      // Sin esto axios serializaría el FormData como JSON (la instancia trae application/json por defecto).
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100)) },
    })
    return data.data
  },
  async deleteEvaluacion(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/evaluaciones/${id}`); return data },
  async createPregunta(idEvaluacion, input) { const { data } = await api.post<Pregunta>(`/capacitaciones/evaluaciones/${idEvaluacion}/preguntas`, input); return data },
  async deletePregunta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/preguntas/${id}`); return data },
  async createRespuesta(idPregunta, input) { const { data } = await api.post<Respuesta>(`/capacitaciones/preguntas/${idPregunta}/respuestas`, input); return data },
  async deleteRespuesta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/respuestas/${id}`); return data },
  async listElegibles(filtros) {
    const { data } = await api.get<EmpleadoCapElegible[]>('/capacitaciones/empleados/elegibles', { params: filtros })
    return data
  },
  async asignarPrimaria(empleadoIds) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones', { empleadoIds }); return data },
  async asignarSecundaria(empleadoId, idPensum) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones/secundaria', { empleadoId, idPensum }); return data },
  async reabrir(idAsignacion, input) {
    const { data } = await api.post<ReabrirResult>(`/capacitaciones/asignaciones/${idAsignacion}/reabrir`, input ?? {})
    return data
  },
  async listEmpleados(filtros) {
    const { data } = await api.get<EmpleadoCapResumen[]>('/capacitaciones/empleados', { params: filtros })
    return data
  },
  async getEmpleado(empleadoId) { const { data } = await api.get<EmpleadoCapDetalle>(`/capacitaciones/empleados/${empleadoId}`); return data },
  async generarExamen(input) { const { data } = await api.post<GenerarExamenResult>('/capacitaciones/examenes', input); return data },
  async getExamenPublico(token) { const { data } = await publicApi.get<ExamenPublico>(`/capacitaciones/examen/${token}`); return data },
  async enviarExamen(token, input) { const { data } = await publicApi.post<ResultadoExamen>(`/capacitaciones/examen/${token}`, input); return data },
}

export const capacitacionesApi = USE_MOCK ? mockApi : realApi
