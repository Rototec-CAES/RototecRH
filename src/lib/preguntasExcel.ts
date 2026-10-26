import type ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { PreguntaMasivaInput } from '@/types'

/**
 * Plantilla Excel para cargar las preguntas de una evaluación de capacitación y su lectura de regreso.
 * Una fila = una pregunta, con hasta 6 respuestas (A–F) y la letra de la correcta (opción única).
 */

const HOJA_PREGUNTAS = 'Preguntas'
const HOJA_INSTRUCCIONES = 'Instrucciones'
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
const MAX_PREGUNTAS = 500

const AZUL_ENCABEZADO = 'FF1F4E78'
const VERDE_ENCABEZADO = 'FF2E7D32'
const relleno = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

const COLUMNAS: { key: string; titulo: string; ancho: number }[] = [
  { key: 'pregunta', titulo: 'Pregunta', ancho: 60 },
  { key: 'puntos', titulo: 'Puntos', ancho: 10 },
  ...LETRAS.map((l) => ({ key: `r${l}`, titulo: `Respuesta ${l}`, ancho: 32 })),
  { key: 'correcta', titulo: 'Correcta', ancho: 11 },
]

const EJEMPLOS: (string | number)[][] = [
  ['¿Qué significa EPP?', 50, 'Equipo de protección personal', 'Examen previo de planta', 'Equipo de producción plástica', '', '', '', 'A'],
  ['¿Cuál es el primer paso antes de operar la extrusora?', 50, 'Encenderla', 'Revisar el área y el bloqueo de energía', 'Llamar al supervisor', 'Ninguna', '', '', 'B'],
]

export async function descargarPlantillaPreguntas(nombreEvaluacion?: string | null): Promise<void> {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  const ws = wb.addWorksheet(HOJA_PREGUNTAS, { views: [{ state: 'frozen', ySplit: 1 }] })
  const instr = wb.addWorksheet(HOJA_INSTRUCCIONES)

  ws.columns = COLUMNAS.map((c) => ({ key: c.key, header: c.titulo, width: c.ancho }))
  ws.getRow(1).eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = relleno(col === COLUMNAS.length ? VERDE_ENCABEZADO : AZUL_ENCABEZADO)
    cell.alignment = { vertical: 'middle' }
  })
  ws.getCell(1, 1).note = 'Texto de la pregunta. Una pregunta por fila.'
  ws.getCell(1, 2).note = 'Puntos de la pregunta. Déjelo vacío en TODAS las filas para repartir 100 puntos en partes iguales.'
  ws.getCell(1, COLUMNAS.length).note = 'Letra de la respuesta correcta (A–F). Solo una.'
  // Validaciones en las filas de captura.
  for (let fila = 2; fila <= MAX_PREGUNTAS + 1; fila++) {
    ws.getCell(fila, 2).dataValidation = {
      type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100],
      showErrorMessage: true, errorTitle: 'Puntos', error: 'Número entre 0 y 100.',
    }
    ws.getCell(fila, COLUMNAS.length).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`"${LETRAS.join(',')}"`],
      showErrorMessage: true, errorTitle: 'Correcta', error: 'Escriba la letra de la respuesta correcta (A–F).',
    }
    for (let col = 1; col <= COLUMNAS.length; col++) ws.getCell(fila, col).alignment = { wrapText: true, vertical: 'top' }
  }

  instr.columns = [{ width: 110 }]
  const titulo = instr.addRow([`Carga masiva de preguntas${nombreEvaluacion ? ` — ${nombreEvaluacion}` : ''}`])
  titulo.font = { bold: true, size: 14 }
  const reglas = [
    '1. Escriba las preguntas en la hoja "Preguntas", una por fila, a partir de la fila 2. No cambie los encabezados.',
    '2. Cada pregunta necesita al menos 2 respuestas (Respuesta A y B); puede usar hasta 6 (A–F). No deje huecos entre respuestas.',
    '3. En "Correcta" escriba la letra de la única respuesta correcta (A, B, C…).',
    '4. Puntos: lo que vale la pregunta. Si deja la columna vacía en todas las filas, el sistema reparte 100 puntos en partes iguales.',
    '   El módulo se aprueba comparando la suma de puntos obtenidos con su "% Aprobación", así que lo normal es que la suma total sea 100.',
    `5. Máximo ${MAX_PREGUNTAS} preguntas por archivo. Si alguna fila tiene error no se carga nada; corríjala y vuelva a subir.`,
    '6. Al subir puede elegir AGREGAR las preguntas a las que ya existen o REEMPLAZARLAS.',
  ]
  for (const r of reglas) instr.addRow([r])
  instr.addRow([])
  instr.addRow(['En la hoja "Ejemplo" hay dos preguntas de muestra. Esa hoja no se carga.']).font = { bold: true }
  const tabla = wb.addWorksheet('Ejemplo')
  tabla.columns = COLUMNAS.map((c) => ({ key: c.key, header: c.titulo, width: c.ancho }))
  tabla.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = relleno(AZUL_ENCABEZADO)
  })
  for (const e of EJEMPLOS) tabla.addRow(e)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'Plantilla_preguntas_evaluacion.xlsx',
  )
}

// ------------------------------------------------------------------------------------------
// Lectura
// ------------------------------------------------------------------------------------------

export interface LecturaPreguntas {
  preguntas: PreguntaMasivaInput[]
  errores: string[]
  /** Suma de puntos; avisa si no da 100. */
  totalPuntos: number
  puntosRepartidos: boolean
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

function texto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('').trim()
    if ('result' in v) return texto((v.result ?? null) as ExcelJS.CellValue)
    if ('text' in v) return String(v.text).trim()
  }
  return ''
}

export async function leerArchivoPreguntas(file: File): Promise<LecturaPreguntas> {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('No se pudo leer el archivo. Verifique que sea un Excel (.xlsx).')
  }
  const ws = wb.getWorksheet(HOJA_PREGUNTAS) ?? wb.worksheets.find((w) => w.state === 'visible')
  if (!ws) throw new Error(`El archivo no tiene la hoja "${HOJA_PREGUNTAS}".`)

  // Columnas por encabezado, así el orden no importa.
  const porTitulo = new Map(COLUMNAS.map((c) => [normalizar(c.titulo), c.key]))
  const col = new Map<string, number>()
  ws.getRow(1).eachCell((cell, n) => {
    const key = porTitulo.get(normalizar(texto(cell.value)))
    if (key && !col.has(key)) col.set(key, n)
  })
  for (const req of ['pregunta', 'rA', 'rB', 'correcta']) {
    if (!col.has(req)) {
      const t = COLUMNAS.find((c) => c.key === req)?.titulo
      throw new Error(`No se encontró la columna "${t}". Use la plantilla descargada.`)
    }
  }
  const leer = (row: ExcelJS.Row, key: string) => (col.has(key) ? texto(row.getCell(col.get(key) as number).value) : '')

  const errores: string[] = []
  const filas: { fila: number; pregunta: string; puntos: number | null; respuestas: string[]; correcta: number }[] = []
  ws.eachRow((row, numero) => {
    if (numero === 1) return
    const pregunta = leer(row, 'pregunta')
    const respuestasCrudas = LETRAS.map((l) => leer(row, `r${l}`))
    const puntosTxt = leer(row, 'puntos')
    const correctaTxt = leer(row, 'correcta').toUpperCase()
    if (!pregunta && !puntosTxt && !correctaTxt && respuestasCrudas.every((r) => !r)) return

    const f = `Fila ${numero}`
    if (!pregunta) errores.push(`${f}: falta el texto de la pregunta`)
    const ultima = respuestasCrudas.reduce((u, r, i) => (r ? i : u), -1)
    const respuestas = respuestasCrudas.slice(0, ultima + 1)
    if (respuestas.length < 2) errores.push(`${f}: necesita al menos 2 respuestas (A y B)`)
    else if (respuestas.some((r) => !r)) errores.push(`${f}: hay una respuesta vacía entre otras (no deje huecos)`)
    const correcta = LETRAS.indexOf(correctaTxt as (typeof LETRAS)[number])
    if (!correctaTxt) errores.push(`${f}: falta la letra de la respuesta correcta`)
    else if (correcta < 0) errores.push(`${f}: "${correctaTxt}" no es una letra válida (A–F)`)
    else if (correcta >= respuestas.length || !respuestas[correcta]) errores.push(`${f}: la respuesta ${correctaTxt} está vacía`)
    let puntos: number | null = null
    if (puntosTxt) {
      const n = Number(puntosTxt.replace(',', '.'))
      if (!Number.isFinite(n) || n < 0 || n > 100) errores.push(`${f}: los puntos deben ser un número entre 0 y 100`)
      else puntos = n
    }
    filas.push({ fila: numero, pregunta, puntos, respuestas, correcta })
  })

  if (!filas.length) throw new Error('El archivo no tiene preguntas. Escríbalas en la hoja "Preguntas" desde la fila 2.')
  if (filas.length > MAX_PREGUNTAS) errores.push(`El archivo tiene ${filas.length} preguntas; el máximo es ${MAX_PREGUNTAS}.`)

  const conPuntos = filas.filter((f) => f.puntos !== null).length
  const puntosRepartidos = conPuntos === 0
  if (conPuntos > 0 && conPuntos < filas.length) {
    errores.push('Puntos: llene la columna en todas las filas o déjela vacía en todas (para repartir 100 puntos).')
  }
  // Reparto en partes iguales con 2 decimales; la última absorbe el redondeo para sumar 100 exacto.
  const base = Math.floor((100 / filas.length) * 100) / 100
  const preguntas: PreguntaMasivaInput[] = filas.map((f, i) => ({
    pregunta: f.pregunta,
    puntosPorRespuesta: puntosRepartidos
      ? i === filas.length - 1 ? Math.round((100 - base * (filas.length - 1)) * 100) / 100 : base
      : (f.puntos ?? 0),
    respuestas: f.respuestas.map((r, j) => ({ respuesta: r, respuestaCorrecta: j === f.correcta })),
  }))
  const totalPuntos = Math.round(preguntas.reduce((s, p) => s + p.puntosPorRespuesta, 0) * 100) / 100
  return { preguntas, errores, totalPuntos, puntosRepartidos }
}
