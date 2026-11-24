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
  SIN_BIOMETRICO: 'Sin registrar en BioTime',
  NO_EN_BIOTIME: 'Código no existe en BioTime',
  FALTA_HUELLA: 'Falta huella en el reloj',
  CON_HUELLA: 'Con huella',
  NO_APLICA: '',
  SIN_DATO: '',
}

/**
 * Qué significa cada estado, qué falta y quién lo resuelve. Se muestra en la ayuda del listado.
 * El proceso siempre es: 1) registrar en BioTime (RRHH, en este sistema) → 2) huella (encargado, en el reloj).
 */
export const AYUDA_ESTADO_BIO: Record<
  'SIN_BIOMETRICO' | 'FALTA_HUELLA' | 'CON_HUELLA' | 'NO_EN_BIOTIME',
  { paso: string; significa: string; quien: string }
> = {
  SIN_BIOMETRICO: {
    paso: 'Paso 1 pendiente',
    significa: 'El empleado no existe en BioTime y no tiene código. En el reloj no aparece.',
    quien: 'RRHH, en este sistema: botón de huella de la fila o “Registrar pendientes”.',
  },
  FALTA_HUELLA: {
    paso: 'Paso 2 pendiente',
    significa: 'Ya está en BioTime y tiene código, pero todavía no se le registró ninguna huella.',
    quien: 'Encargado del reloj: M/OK → Usuarios → buscar el código → Editar → Huella.',
  },
  CON_HUELLA: {
    paso: 'Completo',
    significa: 'Tiene código y al menos una huella. Ya puede marcar.',
    quien: 'Nadie. Se recomiendan 2 dedos (índice derecho e izquierdo).',
  },
  NO_EN_BIOTIME: {
    paso: 'Revisar',
    significa: 'En RRHH tiene un código, pero ese código no existe (o fue eliminado) en BioTime.',
    quien: 'TI: revisar en la web de BioTime.',
  },
}

/** 'AAAA-MM-DDTHH:mm:ss' (hora local del servidor) → 'DD/MM/AAAA HH:mm', sin pasar por Date (no se corre la zona). */
export function formatFechaHuella(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '—'
}
