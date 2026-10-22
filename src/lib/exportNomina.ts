import { saveAs } from 'file-saver'
import type { CampoTotal, LineaNomina, PlanillaNomina } from '@/types/nomina'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface Columna {
  letra: string
  titulo: string
  grupo: 'datos' | 'ingresos' | 'deducciones' | 'liquido' | 'provisiones'
  campo: keyof LineaNomina
  tipo: 'texto' | 'dias' | 'horas' | 'q'
}

// Mismo orden y letras que "04 Calculo Nomina" (AE queda vacía como separador, igual que el Excel; M y N,
// horas extra mixtas, ya no existen: las horas extra son diurnas o nocturnas).
export const COLUMNAS_NOMINA: Columna[] = [
  { letra: 'A', titulo: 'Código', grupo: 'datos', campo: 'codigo', tipo: 'texto' },
  { letra: 'B', titulo: 'Nombre', grupo: 'datos', campo: 'nombre', tipo: 'texto' },
  { letra: 'C', titulo: 'Puesto', grupo: 'datos', campo: 'puesto', tipo: 'texto' },
  { letra: 'D', titulo: 'Días', grupo: 'datos', campo: 'diasLaborados', tipo: 'dias' },
  { letra: 'E', titulo: 'Días vacaciones', grupo: 'datos', campo: 'diasVacaciones', tipo: 'dias' },
  { letra: 'F', titulo: 'Salario ordinario', grupo: 'ingresos', campo: 'salarioOrdinario', tipo: 'q' },
  { letra: 'G', titulo: 'Vacaciones Q.', grupo: 'ingresos', campo: 'vacaciones', tipo: 'q' },
  { letra: 'H', titulo: 'Bonificación DTO 37-2001', grupo: 'ingresos', campo: 'bonificacion', tipo: 'q' },
  { letra: 'I', titulo: 'Horas extra diurnas', grupo: 'ingresos', campo: 'heDiurnaHoras', tipo: 'horas' },
  { letra: 'J', titulo: 'Monto HE diurnas', grupo: 'ingresos', campo: 'heDiurnaMonto', tipo: 'q' },
  { letra: 'K', titulo: 'Horas extra nocturnas', grupo: 'ingresos', campo: 'heNocturnaHoras', tipo: 'horas' },
  { letra: 'L', titulo: 'Monto HE nocturnas', grupo: 'ingresos', campo: 'heNocturnaMonto', tipo: 'q' },
  { letra: 'O', titulo: 'Pago total horas extra', grupo: 'ingresos', campo: 'heTotal', tipo: 'q' },
  { letra: 'P', titulo: 'Bolsón bonif. máquinas', grupo: 'ingresos', campo: 'bolsonMaquinas', tipo: 'q' },
  { letra: 'Q', titulo: 'Bono rendimiento acabados', grupo: 'ingresos', campo: 'bonoRendimiento', tipo: 'q' },
  { letra: 'R', titulo: 'Bono kilometraje', grupo: 'ingresos', campo: 'bonoKilometraje', tipo: 'q' },
  { letra: 'S', titulo: 'Bono KPI', grupo: 'ingresos', campo: 'bonoKPI', tipo: 'q' },
  { letra: 'T', titulo: 'Comisiones', grupo: 'ingresos', campo: 'comisiones', tipo: 'q' },
  { letra: 'U', titulo: 'Otros ingresos', grupo: 'ingresos', campo: 'otrosIngresos', tipo: 'q' },
  { letra: 'V', titulo: 'Total ingresos', grupo: 'ingresos', campo: 'totalIngresos', tipo: 'q' },
  { letra: 'W', titulo: 'Préstamos', grupo: 'deducciones', campo: 'prestamos', tipo: 'q' },
  { letra: 'X', titulo: 'Anticipos', grupo: 'deducciones', campo: 'anticipos', tipo: 'q' },
  { letra: 'Y', titulo: 'Embargos', grupo: 'deducciones', campo: 'embargos', tipo: 'q' },
  { letra: 'Z', titulo: 'Otros descuentos', grupo: 'deducciones', campo: 'otrosDescuentos', tipo: 'q' },
  { letra: 'AA', titulo: 'IGSS', grupo: 'deducciones', campo: 'igss', tipo: 'q' },
  { letra: 'AB', titulo: 'ISR', grupo: 'deducciones', campo: 'isr', tipo: 'q' },
  { letra: 'AC', titulo: 'Total deducciones', grupo: 'deducciones', campo: 'totalDeducciones', tipo: 'q' },
  { letra: 'AD', titulo: 'Líquido a pagar', grupo: 'liquido', campo: 'liquido', tipo: 'q' },
  { letra: 'AF', titulo: 'Prov. vacaciones', grupo: 'provisiones', campo: 'provVacaciones', tipo: 'q' },
  { letra: 'AG', titulo: 'Prov. Bono 14', grupo: 'provisiones', campo: 'provBono14', tipo: 'q' },
  { letra: 'AH', titulo: 'Prov. aguinaldo', grupo: 'provisiones', campo: 'provAguinaldo', tipo: 'q' },
  { letra: 'AI', titulo: 'Prov. indemnización', grupo: 'provisiones', campo: 'provIndemnizacion', tipo: 'q' },
  { letra: 'AJ', titulo: 'IGSS patronal', grupo: 'provisiones', campo: 'igssPatronal', tipo: 'q' },
  { letra: 'AK', titulo: 'IRTRA', grupo: 'provisiones', campo: 'irtra', tipo: 'q' },
  { letra: 'AL', titulo: 'INTECAP', grupo: 'provisiones', campo: 'intecap', tipo: 'q' },
]

const GRUPOS: Record<Columna['grupo'], { titulo: string; color: string }> = {
  datos: { titulo: '', color: 'FFD9E1F2' },
  ingresos: { titulo: 'Ingresos', color: 'FFE2EFDA' },
  deducciones: { titulo: 'Deducciones', color: 'FFFCE4D6' },
  liquido: { titulo: '', color: 'FFFFF2CC' },
  provisiones: { titulo: 'Cargas patronales y provisiones', color: 'FFEDEDED' },
}

const FMT: Record<Columna['tipo'], string | undefined> = {
  texto: undefined,
  dias: '0.00',
  horas: '0.00',
  q: '"Q" #,##0.00',
}

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} ${y}`
}

export function tituloQuincena(p: Pick<PlanillaNomina, 'anio' | 'mes' | 'quincena'>): string {
  if (p.quincena === 0) return `Planilla mensual de ${MESES[p.mes - 1]} ${p.anio}`
  return `${p.quincena === 1 ? '1ra' : '2da'} Quincena de ${MESES[p.mes - 1]} ${p.anio}`
}

export async function exportarNominaExcel(planilla: PlanillaNomina, empresa: string): Promise<void> {
  const { Workbook } = (await import('exceljs')).default
  const wb = new Workbook()
  const ws = wb.addWorksheet('04 Calculo Nomina', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 8 }],
  })

  ws.getCell('A1').value = empresa
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = `Planilla ${planilla.id}${planilla.estado === 'BORRADOR' ? ' (BORRADOR)' : ''}`
  ws.getCell('A3').value = tituloQuincena(planilla)
  ws.getCell('A4').value = `Periodo del ${fechaLarga(planilla.fechaDesde)} al ${fechaLarga(planilla.fechaHasta)}`
  ws.getCell('A5').value =
    planilla.semanaHEDesde && planilla.semanaHEHasta
      ? `Horas extra: semanas ${planilla.semanasHE.map((s) => s.clave.split('-W')[1]).join(', ')} ` +
        `(${fechaLarga(planilla.semanaHEDesde)} al ${fechaLarga(planilla.semanaHEHasta)})`
      : 'Horas extra: no incluidas en esta planilla'
  ws.getCell('A6').value = `Colaboradores: ${planilla.lineas.length}`

  // Fila 7: grupos; fila 8: títulos.
  const filaGrupo = 7
  const filaTitulo = 8
  for (const grupo of Object.keys(GRUPOS) as Columna['grupo'][]) {
    const cols = COLUMNAS_NOMINA.filter((c) => c.grupo === grupo)
    if (!cols.length || !GRUPOS[grupo].titulo) continue
    const rango = `${cols[0].letra}${filaGrupo}:${cols[cols.length - 1].letra}${filaGrupo}`
    ws.mergeCells(rango)
    const cell = ws.getCell(`${cols[0].letra}${filaGrupo}`)
    cell.value = GRUPOS[grupo].titulo
    cell.alignment = { horizontal: 'center' }
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRUPOS[grupo].color } }
  }
  for (const c of COLUMNAS_NOMINA) {
    const cell = ws.getCell(`${c.letra}${filaTitulo}`)
    cell.value = c.titulo
    cell.font = { bold: true }
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRUPOS[c.grupo].color } }
    cell.border = { bottom: { style: 'thin' } }
    ws.getColumn(c.letra).width = c.campo === 'nombre' ? 34 : c.campo === 'puesto' ? 26 : 13
    const fmt = FMT[c.tipo]
    if (fmt) ws.getColumn(c.letra).numFmt = fmt
  }
  ws.getRow(filaTitulo).height = 32
  ws.getColumn('AE').width = 3

  let fila = filaTitulo + 1
  for (const l of planilla.lineas) {
    for (const c of COLUMNAS_NOMINA) ws.getCell(`${c.letra}${fila}`).value = l[c.campo] as string | number | null
    fila++
  }

  // Totales con fórmula SUM, como la fila 14 del Excel.
  const primera = filaTitulo + 1
  const ultima = fila - 1
  ws.getCell(`B${fila}`).value = 'Totales'
  for (const c of COLUMNAS_NOMINA) {
    if (c.tipo === 'texto') continue
    const cell = ws.getCell(`${c.letra}${fila}`)
    const total = planilla.totales[c.campo as CampoTotal] ?? 0
    cell.value = ultima >= primera ? { formula: `SUM(${c.letra}${primera}:${c.letra}${ultima})`, result: total } : 0
  }
  ws.getRow(fila).font = { bold: true }
  ws.getRow(fila).border = { top: { style: 'thin' } }

  // Hoja para el banco (06_Reportes_Query "Datos bancarios para pago").
  const banco = wb.addWorksheet('Pago bancario')
  banco.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Nombre', key: 'nombre', width: 36 },
    { header: 'Forma de pago', key: 'formaPago', width: 15 },
    { header: 'Código banco', key: 'codigoBanco', width: 13 },
    { header: 'Banco', key: 'bancoNombre', width: 24 },
    { header: 'Tipo de cuenta', key: 'tipoCuenta', width: 15 },
    { header: 'No. cuenta', key: 'numeroCuenta', width: 20 },
    { header: 'Líquido', key: 'liquido', width: 14, style: { numFmt: '"Q" #,##0.00' } },
  ]
  banco.getRow(1).font = { bold: true }
  for (const l of planilla.lineas) {
    banco.addRow({ ...l, codigoBanco: l.banco?.codigo ?? l.codigoBanco, bancoNombre: l.banco?.nombre ?? 'Sin equivalencia' })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const nombre = `Planilla_${planilla.anio}-${String(planilla.mes).padStart(2, '0')}${planilla.quincena === 0 ? '-Mensual' : `-Q${planilla.quincena}`}.xlsx`
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre)
}
