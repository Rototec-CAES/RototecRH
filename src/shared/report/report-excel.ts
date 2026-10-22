/**
 * Exportación estándar a Excel (igual que la intranet): ExcelJS cargado bajo demanda,
 * encabezado en negrita sobre slate-200 y fila 1 congelada.
 */
import { saveAs } from 'file-saver'
import type { Worksheet } from 'exceljs'

export interface ColumnaExcel {
  header: string
  key: string
  width: number
}

export interface HojaExcel {
  nombre: string
  columnas: ColumnaExcel[]
  filas: Record<string, unknown>[]
  /** Ajustes extra después de agregar las filas (numFmt, filas de total, ...). */
  ajustar?: (ws: Worksheet) => void
}

export function estilizarEncabezado(ws: Worksheet) {
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FF0F172A' } }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function descargarExcel(nombreArchivo: string, hojas: HojaExcel[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  for (const hoja of hojas) {
    const ws = wb.addWorksheet(hoja.nombre)
    ws.columns = hoja.columnas.map((c) => ({ header: c.header, key: c.key, width: c.width }))
    hoja.filas.forEach((f) => ws.addRow(f))
    hoja.ajustar?.(ws)
    estilizarEncabezado(ws)
  }
  const buffer = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), nombreArchivo)
}
