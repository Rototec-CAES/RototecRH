/**
 * Helpers de reportes (port de la intranet): fechas sin corrimiento de zona,
 * montos es-GT, sello de tiempo para nombres de archivo y preferencias de UI.
 */
import { useCallback, useEffect, useState } from 'react'

/** Date local → 'YYYY-MM-DD' (sin pasar por UTC). */
export function toISO(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 'YYYY-MM-DD…' → 'dd-mm-aaaa'. Parte el string en vez de construir un Date
 * para no correr la fecha un día en Guatemala (UTC-6).
 */
export function fechaCorta(valor: unknown): string {
  if (!valor) return ''
  const iso = String(valor).slice(0, 10)
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}-${m}-${y}` : ''
}

export function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** 1234.5 → "1,234.50" (es-GT, 2 decimales). */
export function money(n: unknown): string {
  return Number(n ?? 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Montos compactos para ejes y tarjetas: Q1.2K, Q3.45M. */
export function moneyCompact(n: unknown, simbolo = 'Q'): string {
  const v = Number(n ?? 0)
  if (Math.abs(v) >= 1000000) return `${simbolo}${(v / 1000000).toFixed(2)}M`
  if (Math.abs(v) >= 1000) return `${simbolo}${(v / 1000).toFixed(1)}K`
  return `${simbolo}${v.toFixed(0)}`
}

export function hoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function diasAtras(n: number): Date {
  const d = hoy()
  d.setDate(d.getDate() - n)
  return d
}

export function primerDiaDelMes(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** yyyyMMdd-HHmm, para nombres de archivo. */
export function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** Toggle de UI recordado en localStorage (p. ej. mostrar/ocultar una guía). */
export function usePreferenciaVisible(key: string, valorPorDefecto: boolean): [boolean, (v: boolean) => void] {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const guardado = window.localStorage.getItem(key)
      if (guardado !== null) return guardado === 'true'
    } catch {
      /* localStorage no disponible: se queda el default */
    }
    return valorPorDefecto
  })

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(key)
      if (guardado !== null) setVisible(guardado === 'true')
    } catch {
      /* sin localStorage */
    }
  }, [key])

  const cambiar = useCallback(
    (nuevoValor: boolean) => {
      setVisible(nuevoValor)
      try {
        window.localStorage.setItem(key, String(nuevoValor))
      } catch {
        /* no pasa nada si no se puede persistir */
      }
    },
    [key],
  )

  return [visible, cambiar]
}
