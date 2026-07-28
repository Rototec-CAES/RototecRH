import ExcelJS from 'exceljs'
import { formatCatorcena } from '@/lib/utils'
import type { DetalleDiaHE, FuenteTurno } from '@/types'

// =====================================================
// Export a Excel de Horas Extra — réplica "bonita" del Resumen del Machote.
// Usa ExcelJS (estilos ricos: fills, bordes, formatos numéricos, panel congelado).
// =====================================================

export interface FilaExport {
  idEmpleado: number
  nombre: string // "APELLIDOS - Nombres"
  fuente?: FuenteTurno
  periodo: string
  dia: number
  noche: number
  horasEfectivas: number
  excedente: number
  sistemas: string[]
}

export interface ExcluidoExport {
  idEmpleado: number
  nombre: string
  fuente?: FuenteTurno
  diasProgramados: number
}

export interface DetalleEmpleadoExport {
  nombre: string // "APELLIDOS - Nombres"
  fuente?: FuenteTurno
  dias: DetalleDiaHE[]
}

// ---- Paleta (ARGB) ----
const C = {
  tituloBg: 'FF0F172A', // slate-900
  tituloFg: 'FFFFFFFF',
  subFg: 'FF94A3B8', // slate-400
  headBg: 'FF1E293B', // slate-800
  headFg: 'FFFFFFFF',
  borde: 'FFE2E8F0', // slate-200
  zebra: 'FFF8FAFC', // slate-50
  totalBg: 'FFF1F5F9', // slate-100
  acabadosBg: 'FFEDE9FE',
  acabadosFg: 'FF6D28D9',
  maquinasBg: 'FFCCFBF1',
  maquinasFg: 'FF0F766E',
  diaFg: 'FFB45309', // amber-700
  nocheFg: 'FF0369A1', // sky-700
  deficitBg: 'FFFEE2E2',
  deficitFg: 'FFB91C1C',
  excedFg: 'FF047857', // emerald-700
  excluBg: 'FF9F1239', // rose-800
} as const

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MESES[(m ?? 1) - 1] ?? ''} ${y}`
}
function fuenteLabel(f?: FuenteTurno): string {
  return f === 'ACABADOS' ? 'Acabados' : f === 'MAQUINAS' ? 'Máquinas' : f === 'PVC' ? 'PVC' : f === 'GENERAL' ? 'General' : '—'
}

const bordeFino = { style: 'thin' as const, color: { argb: C.borde } }
function conBordes(cell: ExcelJS.Cell) {
  cell.border = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino }
}
function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

/** Banda de título + subtítulo sobre `nCols` columnas. Devuelve la fila donde empieza la tabla. */
function banda(ws: ExcelJS.Worksheet, nCols: number, titulo: string, subtitulo: string): number {
  const last = ws.getColumn(nCols).letter
  ws.mergeCells(`A1:${last}1`)
  const t = ws.getCell('A1')
  t.value = titulo
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: C.tituloFg } }
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  fill(t, C.tituloBg)
  ws.getRow(1).height = 30

  ws.mergeCells(`A2:${last}2`)
  const s = ws.getCell('A2')
  s.value = subtitulo
  s.font = { name: 'Calibri', size: 10, color: { argb: C.subFg } }
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  fill(s, C.tituloBg)
  ws.getRow(2).height = 18
  ws.getRow(3).height = 6 // espaciador
  return 4
}

interface Col {
  header: string
  width: number
  align?: 'left' | 'center' | 'right'
  num?: boolean
}

/** Pinta la fila de encabezados de tabla en `rowIdx` y aplica autofiltro. */
function encabezados(ws: ExcelJS.Worksheet, cols: Col[], rowIdx: number) {
  const row = ws.getRow(rowIdx)
  row.height = 22
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.headFg } }
    cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left', wrapText: true }
    fill(cell, C.headBg)
    conBordes(cell)
    ws.getColumn(i + 1).width = c.width
  })
  ws.autoFilter = { from: { row: rowIdx, column: 1 }, to: { row: rowIdx, column: cols.length } }
}

function badgeFuente(cell: ExcelJS.Cell, f?: FuenteTurno) {
  cell.value = fuenteLabel(f)
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  if (f === 'ACABADOS') {
    fill(cell, C.acabadosBg)
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.acabadosFg } }
  } else if (f === 'MAQUINAS') {
    fill(cell, C.maquinasBg)
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.maquinasFg } }
  } else if (f === 'PVC') {
    fill(cell, 'FFE0F2FE') // sky-100
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } } // sky-700
  } else if (f === 'GENERAL') {
    fill(cell, 'FFE0E7FF') // indigo-100
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF4338CA' } } // indigo-700
  } else {
    cell.font = { name: 'Calibri', size: 10, color: { argb: C.subFg } }
  }
}

// ---- Hoja RESUMEN (réplica del machote) ----
function hojaResumen(wb: ExcelJS.Workbook, filas: FilaExport[], desde: string, hasta: string, notaFiltro: string) {
  const ws = wb.addWorksheet('Resumen', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 18 },
  })
  const cols: Col[] = [
    { header: '#', width: 5, align: 'center' },
    { header: 'Empleado (Apellidos - Nombres)', width: 38 },
    { header: 'Fuente', width: 12, align: 'center' },
    { header: 'Catorcena', width: 22, align: 'center' },
    { header: 'Sistema(s)', width: 14, align: 'center' },
    { header: 'Horas efectivas', width: 13, align: 'right', num: true },
    { header: 'Ordinarias', width: 12, align: 'right', num: true },
    { header: 'Saldo', width: 11, align: 'right', num: true },
    { header: 'HE diurnas', width: 12, align: 'right', num: true },
    { header: 'HE nocturnas', width: 13, align: 'right', num: true },
    { header: 'HE totales', width: 12, align: 'right', num: true },
  ]
  banda(
    ws,
    cols.length,
    'HORAS EXTRA · RESUMEN',
    `Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}   ·   ${filas.length} registro(s)${notaFiltro}   ·   cálculo por catorcena, semanas de 7 días desde el ${fechaLarga(desde)}`,
  )
  const headRow = 4
  encabezados(ws, cols, headRow)

  filas.forEach((f, i) => {
    const r = ws.getRow(headRow + 1 + i)
    const ordinarias = f.horasEfectivas - f.excedente
    const total = f.dia + f.noche
    const vals: (string | number)[] = [
      i + 1,
      f.nombre,
      '', // fuente (badge)
      formatCatorcena(f.periodo),
      f.sistemas.join(' · ') || '—',
      f.horasEfectivas,
      ordinarias,
      f.excedente,
      f.dia,
      f.noche,
      total,
    ]
    vals.forEach((v, ci) => {
      const cell = r.getCell(ci + 1)
      if (ci !== 2) cell.value = v
      conBordes(cell)
      cell.font = { name: 'Calibri', size: 11 }
      const c = cols[ci]
      cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left' }
      if (c.num) cell.numFmt = '0.00'
      if (i % 2 === 1) fill(cell, C.zebra)
    })
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true } // apellidos/nombre
    badgeFuente(r.getCell(3), f.fuente)
    if (i % 2 === 1) fill(r.getCell(3), C.zebra) // mantiene zebra bajo el badge "—"
    // Saldo: déficit rojo, excedente verde.
    const saldo = r.getCell(8)
    if (f.excedente < -0.005) {
      fill(saldo, C.deficitBg)
      saldo.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.deficitFg } }
    } else if (f.excedente > 0.005) {
      saldo.font = { name: 'Calibri', size: 11, color: { argb: C.excedFg } }
    }
    if (f.dia > 0.005) r.getCell(9).font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.diaFg } }
    if (f.noche > 0.005) r.getCell(10).font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.nocheFg } }
    if (total > 0.005) r.getCell(11).font = { name: 'Calibri', size: 11, bold: true }
  })

  // Fila de TOTALES.
  const tIdx = headRow + 1 + filas.length
  const tr = ws.getRow(tIdx)
  tr.height = 20
  const sum = (k: (f: FilaExport) => number) => filas.reduce((s, f) => s + k(f), 0)
  const totEfe = sum((f) => f.horasEfectivas)
  const totOrd = sum((f) => f.horasEfectivas - f.excedente)
  const totDia = sum((f) => f.dia)
  const totNoche = sum((f) => f.noche)
  const totales: (string | number)[] = ['', 'TOTALES', '', '', '', totEfe, totOrd, totEfe - totOrd, totDia, totNoche, totDia + totNoche]
  totales.forEach((v, ci) => {
    const cell = tr.getCell(ci + 1)
    cell.value = v
    fill(cell, C.totalBg)
    cell.font = { name: 'Calibri', size: 11, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: cols[ci].align ?? 'left' }
    if (cols[ci].num) cell.numFmt = '0.00'
    cell.border = { top: { style: 'medium', color: { argb: C.headBg } }, bottom: bordeFino, left: bordeFino, right: bordeFino }
  })
}

// ---- Hoja EXCLUIDOS ----
function hojaExcluidos(wb: ExcelJS.Workbook, excluidos: ExcluidoExport[], desde: string, hasta: string) {
  const ws = wb.addWorksheet('Excluidos', { views: [{ state: 'frozen', ySplit: 4 }] })
  const cols: Col[] = [
    { header: '#', width: 5, align: 'center' },
    { header: 'Empleado (Apellidos - Nombres)', width: 38 },
    { header: 'Fuente', width: 12, align: 'center' },
    { header: 'Días programados', width: 16, align: 'center' },
    { header: 'Razón', width: 30 },
  ]
  banda(
    ws,
    cols.length,
    'HORAS EXTRA · EXCLUIDOS',
    `Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}   ·   ${excluidos.length} empleado(s) con turno que NO marcaron (no vinieron)`,
  )
  // Encabezado en tono rosa (excepción/alerta).
  const headRow = 4
  const hr = ws.getRow(headRow)
  hr.height = 22
  cols.forEach((c, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.headFg } }
    cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left', wrapText: true }
    fill(cell, C.excluBg)
    conBordes(cell)
    ws.getColumn(i + 1).width = c.width
  })
  ws.autoFilter = { from: { row: headRow, column: 1 }, to: { row: headRow, column: cols.length } }

  excluidos.forEach((e, i) => {
    const r = ws.getRow(headRow + 1 + i)
    const vals: (string | number)[] = [i + 1, e.nombre, '', e.diasProgramados, 'No marcó (no vino)']
    vals.forEach((v, ci) => {
      const cell = r.getCell(ci + 1)
      if (ci !== 2) cell.value = v
      conBordes(cell)
      cell.font = { name: 'Calibri', size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: cols[ci].align ?? 'left' }
      if (i % 2 === 1) fill(cell, C.zebra)
    })
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true }
    badgeFuente(r.getCell(3), e.fuente)
    if (i % 2 === 1) fill(r.getCell(3), C.zebra)
    r.getCell(5).font = { name: 'Calibri', size: 11, color: { argb: C.deficitFg } }
  })
}

// ---- Hoja DETALLE DÍA A DÍA (réplica de DetalleCalculos/BASEDATOS) ----
const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function diaSem(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return DIAS_SEM[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? ''
}
function hhmm(h: string | null): string {
  return h && h !== '00:00:00' ? h.slice(0, 5) : '—'
}
function rango(a: string | null, b: string | null): string {
  const x = hhmm(a)
  const y = hhmm(b)
  return x === '—' && y === '—' ? '—' : `${x}–${y}`
}
function fmtDur(min: number): string {
  const a = Math.abs(Math.round(min))
  const h = Math.floor(a / 60)
  const m = a % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
function estadoTexto(d: DetalleDiaHE): string {
  if (d.tipo === 'AUSENTE') return 'No se presentó'
  const out: string[] = []
  if (d.faltaMarca) out.push('Falta marca')
  if (d.marcaSinTurno) out.push('Marcó s/turno')
  if (d.marcaFueraDeTurno) out.push('Marca fuera de turno')
  if (d.entradaAntes && d.entradaDeltaMin != null) out.push(`Entró ${fmtDur(d.entradaDeltaMin)} antes`)
  if (d.entradaTarde && d.entradaDeltaMin != null) out.push(`Entró ${fmtDur(d.entradaDeltaMin)} tarde`)
  if (d.salidaTemprano && d.salidaDeltaMin != null && !d.horarioAutorizado) out.push(`Salió ${fmtDur(d.salidaDeltaMin)} antes`)
  if (d.salidaTarde && d.salidaDeltaMin != null) out.push(`Salió ${fmtDur(d.salidaDeltaMin)} después`)
  if (d.horarioAutorizado) out.push(`Horario autorizado${d.cumplimientoPct != null ? ` (meta ${d.cumplimientoPct.toFixed(2)}%)` : ''}`)
  if (!out.length) return d.tipo === 'DIA' || d.tipo === 'NOCHE' ? 'OK' : ''
  return out.join('; ')
}

function hojaDetalle(wb: ExcelJS.Workbook, empleados: DetalleEmpleadoExport[], desde: string, hasta: string) {
  const ws = wb.addWorksheet('Detalle día a día', { views: [{ state: 'frozen', ySplit: 4 }] })
  const cols: Col[] = [
    { header: 'Empleado', width: 32 },
    { header: 'Fecha', width: 11, align: 'center' },
    { header: 'Día', width: 6, align: 'center' },
    { header: 'Tipo', width: 10, align: 'center' },
    { header: 'Sistema', width: 9, align: 'center' },
    { header: 'Programado', width: 13, align: 'center' },
    { header: 'Biométrico', width: 13, align: 'center' },
    { header: 'Oficial', width: 13, align: 'center' },
    { header: 'Efectivas', width: 10, align: 'right', num: true },
    { header: 'Meta', width: 11, align: 'right', num: true },
    { header: 'Ejecutado', width: 12, align: 'right', num: true },
    { header: '% Cumpl.', width: 9, align: 'right' },
    { header: 'Estado', width: 30 },
  ]
  const totalDias = empleados.reduce((s, e) => s + e.dias.length, 0)
  banda(
    ws,
    cols.length,
    'HORAS EXTRA · DETALLE DÍA A DÍA',
    `Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}   ·   ${empleados.length} empleado(s), ${totalDias} día(s)   ·   programado vs biométrico vs oficial`,
  )
  const headRow = 4
  encabezados(ws, cols, headRow)

  let row = headRow + 1
  empleados.forEach((emp, bi) => {
    const bloqueClaro = bi % 2 === 1 // zebra por EMPLEADO (no por fila), para agrupar visualmente
    emp.dias.forEach((d, di) => {
      const r = ws.getRow(row)
      const grave = d.tipo === 'AUSENTE' || d.faltaMarca || d.marcaSinTurno || d.marcaFueraDeTurno
      const leve = d.inconsistente && !grave
      const vals: (string | number)[] = [
        emp.nombre,
        d.fecha,
        diaSem(d.fecha),
        d.tipo,
        d.sistema || '—',
        rango(d.turnoIngreso, d.turnoSalida),
        rango(d.marcaIngreso, d.marcaSalida),
        rango(d.ingreso, d.egreso),
        d.efectivas,
        d.metaDia ?? '',
        d.ejecutado ?? '',
        d.cumplimientoPct != null ? `${d.cumplimientoPct.toFixed(2)}%` : '',
        estadoTexto(d),
      ]
      vals.forEach((v, ci) => {
        const cell = r.getCell(ci + 1)
        cell.value = v
        cell.font = { name: 'Calibri', size: 10 }
        cell.alignment = { vertical: 'middle', horizontal: cols[ci].align ?? 'left' }
        if (cols[ci].num) cell.numFmt = '0.00'
        // Borde: línea más marcada arriba cuando cambia de empleado.
        cell.border = {
          top: di === 0 ? { style: 'medium', color: { argb: C.headBg } } : bordeFino,
          bottom: bordeFino,
          left: bordeFino,
          right: bordeFino,
        }
        if (bloqueClaro) fill(cell, C.zebra)
      })
      r.getCell(1).font = { name: 'Calibri', size: 10, bold: di === 0 } // resalta el nombre en la 1ª fila del bloque
      // Tipo con color.
      const tipoCell = r.getCell(4)
      if (d.tipo === 'AUSENTE') tipoCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.deficitFg } }
      else if (d.tipo === 'NOCHE') tipoCell.font = { name: 'Calibri', size: 10, color: { argb: C.nocheFg } }
      else if (d.tipo === 'DIA') tipoCell.font = { name: 'Calibri', size: 10, color: { argb: C.diaFg } }
      else tipoCell.font = { name: 'Calibri', size: 10, color: { argb: C.subFg } }
      // Estado con color (grave rojo, leve ámbar).
      const estadoCell = r.getCell(13)
      if (grave) estadoCell.font = { name: 'Calibri', size: 10, color: { argb: C.deficitFg } }
      else if (leve) estadoCell.font = { name: 'Calibri', size: 10, color: { argb: C.diaFg } }
      else estadoCell.font = { name: 'Calibri', size: 10, color: { argb: C.subFg } }
      row++
    })
  })
}

async function descargar(wb: ExcelJS.Workbook, nombre: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Construye el libro con Resumen (réplica del machote) + Detalle día a día + Excluidos. */
export function construirLibroHorasExtra(opts: {
  filas: FilaExport[]
  excluidos: ExcluidoExport[]
  detalle?: DetalleEmpleadoExport[]
  desde: string
  hasta: string
  fuente?: 'TODAS' | FuenteTurno
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RototecRH'
  const notaFiltro = opts.fuente && opts.fuente !== 'TODAS' ? `   ·   fuente: ${fuenteLabel(opts.fuente)}` : ''
  hojaResumen(wb, opts.filas, opts.desde, opts.hasta, notaFiltro)
  if (opts.detalle && opts.detalle.length) hojaDetalle(wb, opts.detalle, opts.desde, opts.hasta)
  if (opts.excluidos.length) hojaExcluidos(wb, opts.excluidos, opts.desde, opts.hasta)
  return wb
}

/** Construye el libro con SOLO la hoja de empleados excluidos. */
export function construirLibroExcluidos(opts: {
  excluidos: ExcluidoExport[]
  desde: string
  hasta: string
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RototecRH'
  hojaExcluidos(wb, opts.excluidos, opts.desde, opts.hasta)
  return wb
}

/** Exporta el Resumen (réplica del machote) + Detalle día a día + Excluidos en un solo libro. */
export async function exportarHorasExtra(opts: {
  filas: FilaExport[]
  excluidos: ExcluidoExport[]
  detalle?: DetalleEmpleadoExport[]
  desde: string
  hasta: string
  fuente?: 'TODAS' | FuenteTurno
}): Promise<void> {
  await descargar(construirLibroHorasExtra(opts), `HorasExtra_${opts.desde}_a_${opts.hasta}.xlsx`)
}

/** Exporta SOLO la hoja de empleados excluidos. */
export async function exportarExcluidos(opts: {
  excluidos: ExcluidoExport[]
  desde: string
  hasta: string
}): Promise<void> {
  await descargar(construirLibroExcluidos(opts), `HorasExtra_Excluidos_${opts.desde}_a_${opts.hasta}.xlsx`)
}
