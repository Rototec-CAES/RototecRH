// Contrato del módulo de planilla del MS de RRHH (/rrhh/planillas, /rrhh/descuentos-empleado).
// Las columnas siguen las letras de la hoja "04 Calculo Nomina".

export type EstadoPlanillaNomina = 'BORRADOR' | 'CERRADA'
/** 1 y 2 = planilla quincenal; 0 = planilla mensual (todo el mes). */
export type QuincenaNum = 0 | 1 | 2
export type TipoPlanilla = 'QUINCENAL' | 'MENSUAL'

export const tipoDePlanilla = (q: QuincenaNum): TipoPlanilla => (q === 0 ? 'MENSUAL' : 'QUINCENAL')


export interface SemanaISO {
  clave: string // "2026-W38"
  desde: string // lunes
  hasta: string // domingo
}

export interface AvisosPlanilla {
  sinSalario: { idEmpleado: number; nombre: string }[]
  heNoIncluidas: { idEmpleado: number; nombre: string; horas: number }[]
  sinMarcas: { idEmpleado: number; nombre: string; diasProgramados: number }[]
  generales: string[]
}

export interface LineaNomina {
  idEmpleado: number
  codigo: string | null // A
  nombre: string // B
  puesto: string | null // C
  departamento: string | null
  salarioBase: number
  bonificacionBase: number
  formaPago: string | null
  /** Código único que el banco le asigna al colaborador (enrollment); no identifica a un banco. */
  codigoBanco: string | null
  numeroCuenta: string | null
  tipoCuenta: string | null
  numeroIGSS: string | null
  nit: string | null
  diasLaborados: number // D
  diasVacaciones: number // E
  diasNoPagados: number
  diasFueraContrato: number
  salarioOrdinario: number // F
  vacaciones: number // G
  bonificacion: number // H
  heDiurnaHorasCalc: number
  heNocturnaHorasCalc: number
  heDiurnaOverride: number | null
  heNocturnaOverride: number | null
  heDiurnaHoras: number // I
  heDiurnaMonto: number // J
  heNocturnaHoras: number // K
  heNocturnaMonto: number // L
  heTotal: number // O
  bolsonMaquinas: number // P
  bonoRendimiento: number // Q
  bonoKilometraje: number // R
  bonoKPI: number // S
  comisiones: number // T
  otrosIngresos: number // U
  totalIngresos: number // V
  prestamos: number // W
  anticipos: number // X
  embargos: number // Y
  otrosDescuentos: number // Z
  igss: number // AA
  isrOverride: number | null
  isr: number // AB
  totalDeducciones: number // AC
  liquido: number // AD
  provVacaciones: number // AF
  provBono14: number // AG
  provAguinaldo: number // AH
  provIndemnizacion: number // AI
  igssPatronal: number // AJ
  irtra: number // AK
  intecap: number // AL
  notas: string | null
  avisos: string[]
}

export type CampoTotal = Exclude<
  {
    [K in keyof LineaNomina]: LineaNomina[K] extends number ? K : never
  }[keyof LineaNomina],
  undefined
>

export type TotalesNomina = { cantidadEmpleados: number } & Partial<Record<CampoTotal, number>>

export interface PlanillaNomina {
  id: number
  empresaId: number
  anio: number
  mes: number
  quincena: QuincenaNum
  fechaDesde: string
  fechaHasta: string
  semanaHEDesde: string | null
  semanaHEHasta: string | null
  semanasHE: SemanaISO[]
  estado: EstadoPlanillaNomina
  avisos: AvisosPlanilla
  fechaGeneracion: string
  fechaCierre: string | null
  lineas: LineaNomina[]
  totales: TotalesNomina
}

export interface PropuestaPlanilla {
  fechaDesde: string
  fechaHasta: string
  semanaHEDesde: string | null
  semanaHEHasta: string | null
  semanasHE: SemanaISO[]
  ultimaSemanaPagada: string | null
  existente: { id: number; estado: EstadoPlanillaNomina } | null
}

export interface PeriodoPlanilla {
  empresaId: number
  anio: number
  mes: number // 1–12
  quincena: QuincenaNum
}

export interface GenerarPlanillaInput extends PeriodoPlanilla {
  semanaHEDesde: string | null
  semanaHEHasta: string | null
}

/** Campos que RRHH puede editar en una línea en BORRADOR. null en un *Override vuelve al calculado. */
export interface LineaNominaParche {
  heDiurnaOverride?: number | null
  heNocturnaOverride?: number | null
  bolsonMaquinas?: number
  bonoRendimiento?: number
  bonoKilometraje?: number
  bonoKPI?: number
  comisiones?: number
  otrosIngresos?: number
  anticipos?: number
  otrosDescuentos?: number
  isrOverride?: number | null
  notas?: string | null
}

export interface SemanaHEPlanilla {
  desde: string
  hasta: string
  sistema: string
  diasEnSemana: number
  horasEfectivas: number
  ordinarias: number
  excedente: number
  propDia: number
  propNoche: number
  saldoDia: number
  saldoNoche: number
}

export interface ParametroNomina {
  clave: string
  valor: number
  descripcion: string | null
}

export type TipoDescuento = 'PRESTAMO' | 'EMBARGO'

export interface DescuentoEmpleado {
  id: number
  idEmpleado: number
  empleado: string
  codigo: string
  empresaId: number | null
  tipo: TipoDescuento
  descripcion: string | null
  montoTotal: number | null
  cuota: number
  saldo: number | null
  activo: boolean
  fechaInicio: string
  fechaCreacion: string
}

export interface DescuentoEmpleadoInput {
  idEmpleado: number
  tipo: TipoDescuento
  descripcion?: string
  montoTotal?: number | null
  cuota: number
  fechaInicio: string
}

export interface DescuentoEmpleadoParche {
  descripcion?: string
  cuota?: number
  saldo?: number | null
  activo?: boolean
}
