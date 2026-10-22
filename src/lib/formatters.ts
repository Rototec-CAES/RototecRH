/**
 * Formateo centralizado (port de la intranet). Coexiste con formatQ/formatDate de
 * lib/utils.ts: no los reemplaza.
 */

/** Formato numérico: 1,039.37 — coma = miles, punto = decimal */
const NUM_LOCALE = 'en-US' as const
/** Idioma de textos de fecha: español de Guatemala */
const DATE_LOCALE = 'es-GT' as const
/** Zona horaria oficial de Guatemala (UTC-6, sin horario de verano) */
export const GT_TIMEZONE = 'America/Guatemala' as const

const _numFmt = new Intl.NumberFormat(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const _intFmt = new Intl.NumberFormat(NUM_LOCALE, { maximumFractionDigits: 0 })
const _fechaLargaFmt = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: GT_TIMEZONE,
})
const _fechaCortaFmt = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: GT_TIMEZONE,
})
const _timestampFmt = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: GT_TIMEZONE,
})

/** "2024-05-10T00:00:00.000Z" → "2024-05-10" */
function _toDateSlice(v: string): string {
  return v.length > 10 ? v.slice(0, 10) : v
}

/** Hora del API: ISO con base 1970-01-01 en UTC, o "HH:mm[:ss]". */
function _parseHoraApi(v: string): { h: number; m: number } {
  if (v.includes('T')) {
    const d = new Date(v)
    return { h: d.getUTCHours(), m: d.getUTCMinutes() }
  }
  const [hh = 0, mm = 0] = v.split(':').map(Number)
  return { h: hh, m: mm }
}

function _toAmPm(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

function _toMs(v: string): number {
  if (v.includes('T')) return new Date(v).getTime()
  const [h = 0, m = 0] = v.split(':').map(Number)
  return (h * 60 + m) * 60_000
}

export const fmt = {
  /** 1039.37 → "1,039.37" */
  num(n: number): string {
    return _numFmt.format(Number(n) || 0)
  },
  /** 1039 → "1,039" */
  int(n: number): string {
    return _intFmt.format(Math.round(Number(n) || 0))
  },
  /** 70.98 → "70.98%" */
  pct(n: number, decimals = 2): string {
    return `${(Number(n) || 0).toFixed(decimals)}%`
  },
  /** "2026-08-06" → "jueves 6 de agosto de 2026" */
  fecha(iso: string): string {
    try {
      return _fechaLargaFmt.format(new Date(`${_toDateSlice(iso)}T12:00:00`))
    } catch {
      return iso
    }
  },
  /** "2026-08-06" → "jue. 6 ago." */
  fechaCorta(iso: string): string {
    try {
      return _fechaCortaFmt.format(new Date(`${_toDateSlice(iso)}T12:00:00`))
    } catch {
      return iso
    }
  },
  /** "06:00" → "06:00 AM" */
  hora(v?: string): string {
    if (!v) return '—'
    try {
      const { h, m } = _parseHoraApi(String(v))
      return _toAmPm(h, m)
    } catch {
      return String(v)
    }
  },
  /** "06:00", "18:00" → "06:00 AM - 06:00 PM" */
  horario(desde: string, hasta?: string): string {
    if (hasta !== undefined) return `${fmt.hora(desde)} - ${fmt.hora(hasta)}`
    const parts = desde.split(' – ')
    return parts.length === 2 ? `${fmt.hora(parts[0])} - ${fmt.hora(parts[1])}` : desde
  },
  /** "06:00" + "18:00" → "12 hrs" */
  duracion(inicio?: string, fin?: string): string {
    if (!inicio || !fin) return ''
    try {
      let diff = _toMs(fin) - _toMs(inicio)
      if (diff < 0) diff += 24 * 3_600_000
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      if (h === 0) return `${m} min`
      return m > 0 ? `${h} hrs ${m} min` : `${h} hrs`
    } catch {
      return ''
    }
  },
  /** "2026-08-06T18:30:00.000Z" → "06 ago. 2026, 12:30 p. m." (hora Guatemala) */
  timestamp(iso: string): string {
    try {
      return _timestampFmt.format(new Date(iso))
    } catch {
      return iso
    }
  },
} as const
