import type { HuellaBiotime } from '@/types'

/**
 * Estado del empleado frente al reloj biométrico, del peor al mejor:
 * - SIN_BIOMETRICO: no tiene código BioTime en RRHH (p. ej. carga masiva). No aparece en el reloj.
 * - NO_EN_BIOTIME: tiene código en RRHH pero ese código no existe (o fue eliminado) en BioTime.
 * - FALTA_HUELLA: está en BioTime pero todavía no se le enroló ninguna huella.
 * - CON_HUELLA: listo para marcar.
 * - NO_APLICA: de baja y sin código.
 * - SIN_DATO: tiene código pero aún no se pudo consultar BioTime (cargando o error).
 */
export type EstadoBiometrico =
  | 'SIN_BIOMETRICO'
  | 'NO_EN_BIOTIME'
  | 'FALTA_HUELLA'
  | 'CON_HUELLA'
  | 'NO_APLICA'
  | 'SIN_DATO'

export interface InfoBiometrico {
  estado: EstadoBiometrico
  codigo: number | null
  huella: HuellaBiotime | null
}

export function infoBiometrico(
  codigo: number | null | undefined,
  activo: boolean,
  huellas: Map<number, HuellaBiotime> | undefined,
): InfoBiometrico {
  if (codigo == null) return { estado: activo ? 'SIN_BIOMETRICO' : 'NO_APLICA', codigo: null, huella: null }
  if (!huellas) return { estado: 'SIN_DATO', codigo, huella: null }
  const h = huellas.get(codigo) ?? null
  if (!h || h.eliminadoEnBiotime) return { estado: 'NO_EN_BIOTIME', codigo, huella: h }
  return { estado: h.huellas > 0 ? 'CON_HUELLA' : 'FALTA_HUELLA', codigo, huella: h }
}

export const ETIQUETA_ESTADO_BIO: Record<EstadoBiometrico, string> = {
  SIN_BIOMETRICO: 'Sin biométrico',
  NO_EN_BIOTIME: 'No existe en BioTime',
  FALTA_HUELLA: 'Falta huella',
  CON_HUELLA: 'Con huella',
  NO_APLICA: '',
  SIN_DATO: '',
}

/** 'AAAA-MM-DDTHH:mm:ss' (hora local del servidor) → 'DD/MM/AAAA HH:mm', sin pasar por Date (no se corre la zona). */
export function formatFechaHuella(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '—'
}
