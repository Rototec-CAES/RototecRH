import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQ(value: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  // Las fechas vienen como 'YYYY-MM-DD' o ISO con hora. Tomamos solo la parte de
  // fecha y armamos un Date LOCAL; si usáramos new Date('YYYY-MM-DD') JS lo lee
  // como medianoche UTC y en GT (UTC-6) se corre un día hacia atrás.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// =====================================================
// Catorcena (periodo del cálculo de horas extra)
// =====================================================
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function diaMes(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MESES_CORTOS[(m ?? 1) - 1] ?? ''}`
}

/**
 * El backend devuelve el periodo como "AAAA-MM-DD..AAAA-MM-DD": la catorcena anclada al primer
 * día del rango consultado. "2026-05-04..2026-05-17" → "04 may – 17 may 2026".
 */
export function formatCatorcena(periodo: string): string {
  const [desde, hasta] = periodo.split('..')
  if (!desde || !hasta) return periodo
  return `${diaMes(desde)} – ${diaMes(hasta)} ${hasta.slice(0, 4)}`
}

/** Rango corto sin año, para columnas angostas: "04 may – 17 may". */
export function formatRangoCorto(desde: string, hasta: string): string {
  return `${diaMes(desde)} – ${diaMes(hasta)}`
}

export interface PartesNombre {
  primerNombre: string
  segundoNombre?: string
  tercerNombre?: string
  primerApellido: string
  segundoApellido?: string
  apellidoCasada?: string
}

// Formato de planilla Rototec: APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2 (mayúsculas)
// Incluye apellidoCasada después de los apellidos si existe.
export function nombreCompletoPlanilla(p: PartesNombre): string {
  const partes = [
    p.primerApellido,
    p.segundoApellido,
    p.apellidoCasada,
    p.primerNombre,
    p.segundoNombre,
    p.tercerNombre,
  ]
  return partes
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
    .toUpperCase()
}

// Formato legible para UI (orden natural, casing original). Si no hay partes estructuradas
// (primerNombre/primerApellido…), cae a las columnas legacy nombre/apellido del backend.
export function nombreParaMostrar(
  p: PartesNombre & { nombre?: string | null; apellido?: string | null },
): string {
  const nombres = [p.primerNombre, p.segundoNombre, p.tercerNombre]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
  const apellidos = [p.primerApellido, p.segundoApellido, p.apellidoCasada]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
  const completo = `${nombres} ${apellidos}`.trim()
  if (completo) return completo
  return `${limpio(p.nombre)} ${limpio(p.apellido)}`.trim()
}

// Limpia basura típica de la BD ('null', 'undefined', vacíos)
function limpio(v: string | null | undefined): string {
  const t = (v ?? '').trim()
  if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return ''
  return t
}

// Campos de nombre de un empleado del backend (partes opcionales + columnas legacy)
export interface CamposNombreEmpleado {
  id: number
  nombre: string | null
  apellido: string | null
  primerNombre: string | null
  segundoNombre: string | null
  tercerNombre: string | null
  primerApellido: string | null
  segundoApellido: string | null
  apellidoCasada: string | null
}

// Nombre legible de un empleado: usa las partes estructuradas; si no hay primer
// nombre + primer apellido, cae a las columnas nombre/apellido de la tabla; en
// último caso, #id.
export function nombreEmpleado(e: CamposNombreEmpleado): string {
  const pn = limpio(e.primerNombre)
  const pa = limpio(e.primerApellido)
  if (pn && pa) {
    return nombreParaMostrar({
      primerNombre: pn,
      segundoNombre: limpio(e.segundoNombre),
      tercerNombre: limpio(e.tercerNombre),
      primerApellido: pa,
      segundoApellido: limpio(e.segundoApellido),
      apellidoCasada: limpio(e.apellidoCasada),
    })
  }
  const legacy = `${limpio(e.nombre)} ${limpio(e.apellido)}`.trim()
  if (legacy) return legacy
  const partes = nombreParaMostrar({ primerNombre: pn, primerApellido: pa })
  return partes || `#${e.id}`
}

// Nombre en formato "APELLIDOS - NOMBRES" (para listados ordenados por apellido). Cae a las columnas
// legacy y, en último caso, a `nombreEmpleado`.
export function apellidosNombre(e: CamposNombreEmpleado): string {
  const apellidos = [e.primerApellido, e.segundoApellido, e.apellidoCasada].map(limpio).filter(Boolean).join(' ')
  const nombres = [e.primerNombre, e.segundoNombre, e.tercerNombre].map(limpio).filter(Boolean).join(' ')
  if (apellidos && nombres) return `${apellidos} - ${nombres}`
  if (apellidos) return apellidos
  return nombreEmpleado(e)
}

// =====================================================
// Helpers de hora (turnos)
// =====================================================
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseHora(hhmm: string): number {
  const m = HORA_REGEX.exec(hhmm)
  if (!m) return NaN
  return Number(m[1]) * 60 + Number(m[2])
}

export function formatHora(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Devuelve horas planificadas de un turno. Si la salida es <= entrada, asume
// que cruza medianoche y suma 24h. Descuenta 1h si incluye hora de almuerzo.
export function calcularHorasPlanificadas(
  horaEntrada: string,
  horaSalida: string,
  incluyeAlmuerzo: boolean,
): number {
  const entrada = parseHora(horaEntrada)
  const salida = parseHora(horaSalida)
  if (Number.isNaN(entrada) || Number.isNaN(salida)) return 0
  let diffMin = salida - entrada
  if (diffMin <= 0) diffMin += 24 * 60
  const horas = diffMin / 60
  return Math.max(0, horas - (incluyeAlmuerzo ? 1 : 0))
}

export function umbralHorasExtras(tipo: 'DIURNO' | 'NOCTURNO'): number {
  return tipo === 'DIURNO' ? 44 : 36
}
