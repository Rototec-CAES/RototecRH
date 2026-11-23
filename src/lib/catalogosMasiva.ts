import type { CampoActualizacionMasiva, FilaActualizacionMasiva } from '@/types'

/**
 * Detección de puestos y departamentos del Excel de carga masiva que NO existen en el catálogo,
 * para crearlos (o asociarlos a uno existente) antes de validar el archivo.
 */

export interface RefCatalogo {
  id: number
  nombre: string
}

export interface ReferenciaNueva {
  /** Nombre normalizado (sin tildes, mayúsculas, espacios colapsados): agrupa variantes. */
  clave: string
  /** Nombre tal como viene en el Excel (primera aparición). */
  nombre: string
  /** Filas del Excel donde aparece. */
  filas: number[]
  /** Solo puestos: departamento que traen esas filas (el más frecuente). */
  sugerencia?: { id: number } | { clave: string }
  /** Solo puestos: departamentos (tal como vienen en el Excel) que traen esas filas. */
  departamentosExcel?: string[]
}

export interface ReferenciasNuevas {
  departamentos: ReferenciaNueva[]
  puestos: ReferenciaNueva[]
}

export const CAMPO_PUESTO = 'id_puesto'
export const CAMPO_DEPARTAMENTO = 'id_departamento'

export const claveNombre = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')

/** Igual que el backend: "12", "12 - OPERARIO" o un número = referencia por ID (no es un nombre). */
const RE_ID = /^(\d+)(?:\s*-.*)?$/

function esReferenciaPorId(v: FilaActualizacionMasiva[string]): boolean {
  return typeof v === 'number' || (typeof v === 'string' && RE_ID.test(v.trim()))
}

/** Catálogo (id → nombre) que el backend manda en los valores de la columna de referencia. */
export function catalogoDeCampo(campos: CampoActualizacionMasiva[], campo: string): RefCatalogo[] {
  const def = campos.find((c) => c.campo === campo)
  if (!def) return []
  return def.valores
    .map((v) => ({ id: Number(RE_ID.exec(v.valor)?.[1]), nombre: v.descripcion }))
    .filter((r) => Number.isInteger(r.id) && r.id > 0)
}

type Resolucion = { id: number } | { clave: string } | null

/** Nombre → existe (id), es nuevo (clave) o es ambiguo/ID (null: lo resuelve el backend). */
function resolver(catalogo: Map<string, number[]>, v: FilaActualizacionMasiva[string]): Resolucion {
  if (v === undefined || v === null || typeof v === 'boolean') return null
  if (esReferenciaPorId(v)) {
    const id = Number(RE_ID.exec(String(v).trim())?.[1] ?? v)
    return Number.isInteger(id) ? { id } : null
  }
  const clave = claveNombre(String(v))
  if (!clave) return null
  const ids = catalogo.get(clave)
  if (!ids) return { clave }
  return ids.length === 1 ? { id: ids[0] } : null
}

function indexar(refs: RefCatalogo[]): Map<string, number[]> {
  const m = new Map<string, number[]>()
  for (const r of refs) {
    const k = claveNombre(r.nombre)
    m.set(k, [...(m.get(k) ?? []), r.id])
  }
  return m
}

export function detectarReferenciasNuevas(
  filas: FilaActualizacionMasiva[],
  campos: CampoActualizacionMasiva[],
): ReferenciasNuevas {
  const deptos = indexar(catalogoDeCampo(campos, CAMPO_DEPARTAMENTO))
  const puestos = indexar(catalogoDeCampo(campos, CAMPO_PUESTO))

  const nuevosDeptos = new Map<string, ReferenciaNueva>()
  type PuestoNuevo = ReferenciaNueva & {
    departamentosExcel: string[]
    votos: Map<string, { r: { id: number } | { clave: string }; n: number }>
  }
  const nuevosPuestos = new Map<string, PuestoNuevo>()

  filas.forEach((f, i) => {
    const numero = f.fila ?? i + 2
    const dep = resolver(deptos, f[CAMPO_DEPARTAMENTO])
    if (dep && 'clave' in dep) {
      const r = nuevosDeptos.get(dep.clave) ?? { clave: dep.clave, nombre: String(f[CAMPO_DEPARTAMENTO]).trim().replace(/\s+/g, ' '), filas: [] }
      r.filas.push(numero)
      nuevosDeptos.set(dep.clave, r)
    }

    const pue = resolver(puestos, f[CAMPO_PUESTO])
    if (pue && 'clave' in pue) {
      const r: PuestoNuevo = nuevosPuestos.get(pue.clave) ?? {
        clave: pue.clave,
        nombre: String(f[CAMPO_PUESTO]).trim().replace(/\s+/g, ' '),
        filas: [],
        departamentosExcel: [],
        votos: new Map(),
      }
      r.filas.push(numero)
      const depTexto = f[CAMPO_DEPARTAMENTO]
      if (depTexto !== undefined && depTexto !== null && String(depTexto).trim()) {
        const t = String(depTexto).trim()
        if (!r.departamentosExcel.includes(t)) r.departamentosExcel.push(t)
      }
      if (dep) {
        const k = 'id' in dep ? `id:${dep.id}` : `n:${dep.clave}`
        const voto = r.votos.get(k) ?? { r: dep, n: 0 }
        voto.n++
        r.votos.set(k, voto)
      }
      nuevosPuestos.set(pue.clave, r)
    }
  })

  const porNombre = (a: ReferenciaNueva, b: ReferenciaNueva) => a.nombre.localeCompare(b.nombre)
  return {
    departamentos: [...nuevosDeptos.values()].sort(porNombre),
    puestos: [...nuevosPuestos.values()]
      .map(({ votos, ...r }) => {
        const mejor = [...votos.values()].sort((a, b) => b.n - a.n)[0]
        return mejor ? { ...r, sugerencia: mejor.r } : r
      })
      .sort(porNombre),
  }
}

/**
 * Reemplaza en las filas los nombres de puesto/departamento por su ID (los recién creados o los
 * existentes que eligió el usuario). Devuelve filas nuevas; no muta las originales.
 */
export function reemplazarReferencias(
  filas: FilaActualizacionMasiva[],
  departamentos: Map<string, number>,
  puestos: Map<string, number>,
): FilaActualizacionMasiva[] {
  const cambiar = (v: FilaActualizacionMasiva[string], mapa: Map<string, number>) => {
    if (v === undefined || v === null || typeof v !== 'string' || esReferenciaPorId(v)) return v
    const id = mapa.get(claveNombre(v))
    return id === undefined ? v : String(id)
  }
  return filas.map((f) => ({
    ...f,
    [CAMPO_DEPARTAMENTO]: cambiar(f[CAMPO_DEPARTAMENTO], departamentos),
    [CAMPO_PUESTO]: cambiar(f[CAMPO_PUESTO], puestos),
  }))
}
