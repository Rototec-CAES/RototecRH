// Documento de identificación personal según el país del empleado.
// Una sola fuente para: etiqueta, máscara de entrada (autoformato en vivo) y validación.

export type DocumentoIdentidad = {
  /** Nombre corto que se muestra en el formulario (DPI, DUI, DNI, CURP…). */
  etiqueta: string
  /** 'digitos': solo números, con guiones automáticos. 'alfanumerico': letras y números en mayúsculas. */
  tipo: 'digitos' | 'alfanumerico'
  /** Cantidad exacta de caracteres (sin guiones). */
  longitud: number
  /** Tamaño de cada grupo separado por guion. Ej. [4, 5, 4] → 2678-14908-0602. */
  grupos?: number[]
  /** Validación del valor limpio (sin guiones). */
  regex: RegExp
  /** Mensaje cuando no cumple el formato. */
  mensaje: string
  placeholder: string
}

export const DOCUMENTO_IDENTIDAD_POR_PAIS: Record<string, DocumentoIdentidad> = {
  // DPI / CUI — RENAP
  GT: {
    etiqueta: 'DPI',
    tipo: 'digitos',
    longitud: 13,
    grupos: [4, 5, 4],
    regex: /^\d{13}$/,
    mensaje: 'El DPI debe tener exactamente 13 dígitos',
    placeholder: '0000-00000-0000',
  },
  // Documento Único de Identidad — RNPN
  SV: {
    etiqueta: 'DUI',
    tipo: 'digitos',
    longitud: 9,
    grupos: [8, 1],
    regex: /^\d{9}$/,
    mensaje: 'El DUI debe tener exactamente 9 dígitos',
    placeholder: '00000000-0',
  },
  // Documento Nacional de Identificación — RNP
  HN: {
    etiqueta: 'DNI',
    tipo: 'digitos',
    longitud: 13,
    grupos: [4, 4, 5],
    regex: /^\d{13}$/,
    mensaje: 'El DNI debe tener exactamente 13 dígitos',
    placeholder: '0000-0000-00000',
  },
  // Clave Única de Registro de Población — RENAPO
  MX: {
    etiqueta: 'CURP',
    tipo: 'alfanumerico',
    longitud: 18,
    regex: /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/,
    mensaje: 'CURP inválida (18 caracteres, ej. GODE561231HDFRRN09)',
    placeholder: 'AAAA000000HAAAAA00',
  },
}

export const documentoIdentidad = (pais: string | null | undefined): DocumentoIdentidad | undefined =>
  DOCUMENTO_IDENTIDAD_POR_PAIS[pais ?? '']

/** Quita guiones, espacios, puntos, etc. Devuelve el valor tal como se guarda en la BD. */
export function limpiarDocumento(doc: DocumentoIdentidad, valor: string) {
  return doc.tipo === 'digitos'
    ? valor.replace(/\D/g, '')
    : valor.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Agrega los guiones según los grupos del país. Lo que sobre de la longitud se agrega al final. */
export function formatearDocumento(doc: DocumentoIdentidad, limpio: string) {
  if (!doc.grupos) return limpio
  const partes: string[] = []
  let i = 0
  for (const g of doc.grupos) {
    if (i >= limpio.length) break
    partes.push(limpio.slice(i, i + g))
    i += g
  }
  const resto = limpio.slice(i)
  if (resto) partes[partes.length - 1] += resto
  return partes.join('-')
}
