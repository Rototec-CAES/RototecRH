import type ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type {
  CampoActualizacionMasiva,
  FilaActualizacionMasiva,
  PlantillaActualizacionMasiva,
} from '@/types'

/**
 * Plantilla Excel de actualización masiva de empleados y su lectura de regreso.
 * Las columnas editables vienen del backend (fuente única); aquí solo se arma/lee el archivo.
 */

export const HOJA_DATOS = 'Empleados'
const HOJA_INSTRUCCIONES = 'Instrucciones'
const HOJA_LISTAS = 'Listas'

/**
 * Columnas de solo lectura. En esta primera fase solo el ID (la llave); todo lo demás es editable.
 */
const COLUMNAS_REFERENCIA: { key: string; titulo: string; ancho: number }[] = [
  { key: 'id', titulo: 'ID', ancho: 8 },
]

const GRIS_ENCABEZADO = 'FFD9D9D9'
const GRIS_CELDA = 'FFF2F2F2'
const AZUL_ENCABEZADO = 'FF1F4E78'

const relleno = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

const TIPO_TEXTO: Record<CampoActualizacionMasiva['tipo'], string> = {
  texto: 'Texto',
  numero: 'Número (sin Q ni comas)',
  fecha: 'Fecha AAAA-MM-DD',
  booleano: 'Sí / No',
  catalogo: 'Lista',
  banco: 'Código de banco (lista)',
  referencia: 'Lista "ID - Nombre" (o el ID)',
}

const anchoCampo = (c: CampoActualizacionMasiva) =>
  c.campo === 'direccion' || c.campo === 'motivo_baja'
    ? 36
    : c.campo === 'correo' || c.tipo === 'referencia'
      ? 28
      : Math.max(14, Math.min(24, c.etiqueta.length + 4))

/** Letra de columna Excel (1 → A, 27 → AA). */
function letra(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export async function descargarPlantillaActualizacionMasiva(p: PlantillaActualizacionMasiva) {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  wb.creator = 'RototecRH'
  wb.created = new Date()

  const ws = wb.addWorksheet(HOJA_DATOS, { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] })
  const instr = wb.addWorksheet(HOJA_INSTRUCCIONES)
  const listas = wb.addWorksheet(HOJA_LISTAS, { state: 'veryHidden' })

  // ---- Hoja oculta con las listas de valores (para las validaciones de datos) ----
  const rangoLista = new Map<string, string>()
  let colLista = 1
  for (const c of p.campos) {
    if (!c.valores.length) continue
    const l = letra(colLista)
    listas.getCell(`${l}1`).value = c.campo
    c.valores.forEach((v, i) => {
      listas.getCell(`${l}${i + 2}`).value = v.valor
    })
    rangoLista.set(c.campo, `${HOJA_LISTAS}!$${l}$2:$${l}$${c.valores.length + 1}`)
    colLista++
  }

  // ---- Hoja de datos ----
  ws.columns = [
    ...COLUMNAS_REFERENCIA.map((c) => ({ header: c.titulo, key: c.key, width: c.ancho })),
    ...p.campos.map((c) => ({ header: c.etiqueta, key: c.campo, width: anchoCampo(c) })),
  ]

  const encabezado = ws.getRow(1)
  encabezado.height = 30
  encabezado.eachCell((cell, col) => {
    const soloLectura = col <= COLUMNAS_REFERENCIA.length
    cell.font = { bold: true, color: { argb: soloLectura ? 'FF404040' : 'FFFFFFFF' } }
    cell.fill = relleno(soloLectura ? GRIS_ENCABEZADO : AZUL_ENCABEZADO)
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF808080' } } }
    if (soloLectura) {
      cell.note = 'Llave del empleado. NO la modifique.'
    } else {
      const c = p.campos[col - COLUMNAS_REFERENCIA.length - 1]
      cell.note = `${c.descripcion}\nFormato: ${TIPO_TEXTO[c.tipo]}. Celda vacía = no cambia.`
    }
  })

  for (const f of p.filas) {
    const row = ws.addRow(Object.fromEntries([
      ...COLUMNAS_REFERENCIA.map((c) => [c.key, f[c.key] ?? null]),
      ...p.campos.map((c) => [c.campo, f[c.campo] ?? null]),
    ]))
    for (let i = 1; i <= COLUMNAS_REFERENCIA.length; i++) {
      const cell = row.getCell(i)
      cell.fill = relleno(GRIS_CELDA)
      cell.font = { color: { argb: 'FF595959' } }
    }
    p.campos.forEach((c, j) => {
      const cell = row.getCell(COLUMNAS_REFERENCIA.length + j + 1)
      // Texto para no perder ceros a la izquierda (cuentas, IGSS) ni convertir fechas.
      cell.numFmt = c.tipo === 'numero' ? '#,##0.00' : '@'
      const rango = rangoLista.get(c.campo)
      if (rango) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [rango],
          showErrorMessage: true,
          // Bancos: advertencia (hay códigos antiguos ya cargados que no están en la lista).
          // Puesto/departamento: advertencia para poder escribir solo el ID.
          errorStyle: c.tipo === 'banco' || c.tipo === 'referencia' ? 'warning' : 'stop',
          errorTitle: c.etiqueta,
          error: 'Valor no permitido. Vea la hoja Instrucciones.',
        }
      } else if (c.tipo === 'numero') {
        cell.dataValidation = {
          type: 'decimal',
          operator: 'greaterThanOrEqual',
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: c.etiqueta,
          error: 'Ingrese un número (sin Q ni comas).',
        }
      } else if (c.maxLength) {
        cell.dataValidation = {
          type: 'textLength',
          operator: 'lessThanOrEqual',
          allowBlank: true,
          formulae: [c.maxLength],
          showErrorMessage: true,
          errorTitle: c.etiqueta,
          error: `Máximo ${c.maxLength} caracteres.`,
        }
      }
    })
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS_REFERENCIA.length + p.campos.length } }

  // ---- Instrucciones ----
  instr.columns = [
    { key: 'a', width: 26 },
    { key: 'b', width: 12 },
    { key: 'c', width: 24 },
    { key: 'd', width: 48 },
    { key: 'e', width: 60 },
    { key: 'f', width: 18 },
  ]
  const titulo = instr.addRow(['Actualización masiva de empleados'])
  titulo.font = { bold: true, size: 14 }
  const reglas = [
    '1. Edite las columnas de encabezado AZUL de la hoja "Empleados". La columna GRIS (ID) es la llave del empleado.',
    '2. NO modifique ni borre la columna ID: es la llave que identifica a cada empleado.',
    '3. Celda VACÍA = el dato NO cambia. Con este archivo no se puede borrar un dato existente.',
    '4. Fechas en formato AAAA-MM-DD (ej. 2024-01-15). Números sin "Q" ni separador de miles.',
    '5. Sí/No para las columnas de habilitar y Activo. Las listas desplegables muestran los valores permitidos. Puesto y Departamento: elija "ID - Nombre" de la lista (hay nombres repetidos entre empresas).',
    '6. Para dar de baja: Activo = No, con Tipo de baja y Fecha de baja (último día laborado). Motivo de baja es opcional.',
    '7. Puede borrar las filas de empleados que no quiera actualizar. No agregue empleados nuevos.',
    '8. Al cargar el archivo verá exactamente qué cambiará (valor anterior → nuevo) antes de aplicar.',
    '9. Si alguna fila tiene errores NO se aplica ningún cambio: corrija el archivo y vuelva a cargarlo.',
  ]
  for (const r of reglas) {
    const row = instr.addRow([r])
    instr.mergeCells(`A${row.number}:F${row.number}`)
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    row.height = 30
  }
  instr.addRow([])

  const enc = instr.addRow(['Columna', 'Editable', 'Formato', 'Valores permitidos', 'Descripción', 'Ejemplo'])
  enc.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = relleno(AZUL_ENCABEZADO)
  })
  const refs: [string, string][] = [['ID', 'Llave del empleado (no modificar).']]
  for (const [col, desc] of refs) {
    const row = instr.addRow([col, 'No', '—', '—', desc, ''])
    row.getCell(1).fill = relleno(GRIS_ENCABEZADO)
  }
  for (const c of p.campos) {
    const valores = c.tipo === 'banco'
      ? 'Ver la tabla de bancos abajo'
      : c.tipo === 'referencia'
        ? `Lista desplegable (${c.valores.length} opciones)`
        : c.valores.length
        ? c.valores.map((v) => (v.descripcion && v.descripcion !== v.valor ? `${v.valor} = ${v.descripcion}` : v.valor)).join('\n')
        : c.maxLength
          ? `Hasta ${c.maxLength} caracteres`
          : '—'
    const row = instr.addRow([c.etiqueta, 'Sí', TIPO_TEXTO[c.tipo], valores, c.descripcion, c.ejemplo])
    row.alignment = { wrapText: true, vertical: 'top' }
  }

  instr.addRow([])
  const encBancos = instr.addRow(['Código de banco', 'País', 'Banco'])
  encBancos.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = relleno(AZUL_ENCABEZADO)
  })
  for (const b of p.bancos) instr.addRow([b.codigo, b.pais ?? '', b.nombre])
  instr.addRow([])
  instr.addRow(['Los códigos antiguos que ya tiene un empleado (ej. 105) se respetan si no se cambian; un código nuevo debe estar en esta tabla.'])

  const buf = await wb.xlsx.writeBuffer()
  const hoy = new Date().toISOString().slice(0, 10)
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Actualizacion_masiva_empleados_${hoy}.xlsx`,
  )
}

// ------------------------------------------------------------------------------------------
// Lectura del archivo editado
// ------------------------------------------------------------------------------------------

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

const pad = (n: number) => String(n).padStart(2, '0')

/** Valor de celda de exceljs → texto/número/booleano plano (undefined si está vacía). */
function valorCelda(v: ExcelJS.CellValue): string | number | boolean | undefined {
  if (v === null || v === undefined) return undefined
  if (v instanceof Date) {
    // exceljs entrega las fechas como medianoche UTC.
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'object') {
    if ('richText' in v) return valorCelda(v.richText.map((t) => t.text).join(''))
    if ('result' in v) return valorCelda((v.result ?? null) as ExcelJS.CellValue)
    if ('text' in v) return valorCelda(String(v.text))
    if ('error' in v) return undefined
  }
  return undefined
}

/**
 * Lee el Excel editado → filas para el backend. Ubica las columnas por su encabezado
 * (etiqueta o nombre técnico), así que el orden de columnas no importa.
 */
export async function leerArchivoActualizacionMasiva(
  file: File,
  campos: CampoActualizacionMasiva[],
): Promise<FilaActualizacionMasiva[]> {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('No se pudo leer el archivo. Verifique que sea un Excel (.xlsx).')
  }
  const ws = wb.getWorksheet(HOJA_DATOS) ?? wb.worksheets.find((w) => w.state === 'visible')
  if (!ws) throw new Error(`El archivo no tiene la hoja "${HOJA_DATOS}".`)

  const porEncabezado = new Map<string, string>([['id', 'id']])
  for (const c of campos) {
    porEncabezado.set(normalizar(c.etiqueta), c.campo)
    porEncabezado.set(normalizar(c.campo), c.campo)
  }
  const columnas = new Map<number, string>()
  ws.getRow(1).eachCell((cell, col) => {
    const campo = porEncabezado.get(normalizar(String(valorCelda(cell.value) ?? '')))
    if (campo && ![...columnas.values()].includes(campo)) columnas.set(col, campo)
  })
  if (![...columnas.values()].includes('id')) {
    throw new Error('No se encontró la columna "ID" en la hoja de empleados. Use la plantilla descargada.')
  }
  if (columnas.size === 1) {
    throw new Error('No se encontró ninguna columna editable. Use la plantilla descargada.')
  }

  const filas: FilaActualizacionMasiva[] = []
  ws.eachRow((row, numero) => {
    if (numero === 1) return
    const fila: FilaActualizacionMasiva = { fila: numero }
    let conDatos = false
    for (const [col, campo] of columnas) {
      const v = valorCelda(row.getCell(col).value)
      if (v === undefined) continue
      fila[campo] = v
      conDatos = true
    }
    if (conDatos) filas.push(fila)
  })
  if (!filas.length) throw new Error('El archivo no tiene filas con datos.')
  return filas
}
