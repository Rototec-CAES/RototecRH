import type {
  DepartamentoRototecType,
  EstadoCivilType,
  FormaPagoType,
  FrecuenciaPagoType,
  JornadaType,
  SexoType,
  TemporalidadContratoType,
  TipoBajaType,
  TipoContratoType,
  TipoCuentaType,
  TipoDocumentoType,
} from '@/types'

// =====================================================
// CATÁLOGO DE BANCOS
// Códigos cortos vistos en la planilla de Rototec (520, 618, 781, 105, 107, etc.)
// PENDIENTE: Steven enviará archivo con nombres reales.
// Por ahora son placeholders ordenados por código para que el select funcione.
// =====================================================
export const BANCOS_GUATEMALA: { codigo: string; nombre: string }[] = [
  { codigo: '105', nombre: 'Banco 105 (pendiente nombre)' },
  { codigo: '107', nombre: 'Banco 107 (pendiente nombre)' },
  { codigo: '108', nombre: 'Banco 108 (pendiente nombre)' },
  { codigo: '520', nombre: 'Banco 520 (pendiente nombre)' },
  { codigo: '618', nombre: 'Banco 618 (pendiente nombre)' },
  { codigo: '696', nombre: 'Banco 696 (pendiente nombre)' },
  { codigo: '745', nombre: 'Banco 745 (pendiente nombre)' },
  { codigo: '781', nombre: 'Banco 781 (pendiente nombre)' },
  { codigo: '788', nombre: 'Banco 788 (pendiente nombre)' },
]

// =====================================================
// JORNADAS — sólo Diurna y Nocturna (Mixta eliminada por decisión del cliente)
// La hora "mixta" sigue existiendo como tipo de hora extra, pero no como jornada
// =====================================================
export const JORNADAS: { value: JornadaType; label: string; horasUmbral: number }[] = [
  { value: 'DIURNA', label: 'Diurna', horasUmbral: 44 },
  { value: 'NOCTURNA', label: 'Nocturna', horasUmbral: 36 },
]

// =====================================================
// SEXOS — códigos MINTRAB
// =====================================================
export const SEXOS: { value: SexoType; label: string; codigoMintrab: string }[] = [
  { value: 'M', label: 'Masculino', codigoMintrab: '1' },
  { value: 'F', label: 'Femenino', codigoMintrab: '2' },
]

// =====================================================
// ESTADO CIVIL — códigos MINTRAB
// =====================================================
export const ESTADOS_CIVILES: { value: EstadoCivilType; label: string; codigoMintrab: string }[] = [
  { value: 'SOLTERO', label: 'Soltero(a)', codigoMintrab: '1' },
  { value: 'CASADO', label: 'Casado(a)', codigoMintrab: '2' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)', codigoMintrab: '3' },
  { value: 'VIUDO', label: 'Viudo(a)', codigoMintrab: '4' },
  { value: 'UNION_LIBRE', label: 'Unión de hecho', codigoMintrab: '5' },
]

// =====================================================
// PUEBLO DE PERTENENCIA — códigos MINTRAB
// =====================================================
export const PUEBLOS_GUATEMALA: { codigo: string; label: string }[] = [
  { codigo: '1', label: 'Maya' },
  { codigo: '2', label: 'Garífuna' },
  { codigo: '3', label: 'Xinka' },
  { codigo: '4', label: 'Afrodescendiente / Creole / Afromestizo' },
  { codigo: '5', label: 'Mestizo / Ladino' },
  { codigo: '99', label: 'Otro' },
]

// =====================================================
// COMUNIDAD LINGÜÍSTICA — códigos MINTRAB
// 99 = No aplica / Español
// =====================================================
export const COMUNIDADES_LINGUISTICAS: { codigo: string; label: string }[] = [
  { codigo: '99', label: 'Español / No aplica' },
  { codigo: '1', label: "K'iche'" },
  { codigo: '2', label: "Q'eqchi'" },
  { codigo: '3', label: 'Kaqchikel' },
  { codigo: '4', label: 'Mam' },
  { codigo: '5', label: "Q'anjob'al" },
  { codigo: '6', label: "Poqomchi'" },
  { codigo: '7', label: "Achi'" },
  { codigo: '8', label: 'Ixil' },
  { codigo: '9', label: "Tz'utujil" },
  { codigo: '10', label: 'Garífuna' },
  { codigo: '11', label: 'Xinka' },
  { codigo: '100', label: 'Otra' },
]

// =====================================================
// PAÍSES — ISO 3166-1 alpha-3 (default GTM)
// =====================================================
export const PAISES: { codigo: string; label: string }[] = [
  { codigo: 'GTM', label: 'Guatemala' },
  { codigo: 'MEX', label: 'México' },
  { codigo: 'SLV', label: 'El Salvador' },
  { codigo: 'HND', label: 'Honduras' },
  { codigo: 'NIC', label: 'Nicaragua' },
  { codigo: 'CRI', label: 'Costa Rica' },
  { codigo: 'PAN', label: 'Panamá' },
  { codigo: 'USA', label: 'Estados Unidos' },
  { codigo: 'OTR', label: 'Otro' },
]

// =====================================================
// TIPO DE DOCUMENTO
// =====================================================
export const TIPOS_DOCUMENTO: { value: TipoDocumentoType; label: string }[] = [
  { value: 'DPI', label: 'DPI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
]

// =====================================================
// TIPO DE DISCAPACIDAD — códigos MINTRAB
// =====================================================
export const TIPOS_DISCAPACIDAD: { codigo: string; label: string }[] = [
  { codigo: '1', label: 'Ninguna' },
  { codigo: '2', label: 'Visual' },
  { codigo: '3', label: 'Auditiva' },
  { codigo: '4', label: 'Física / motora' },
  { codigo: '5', label: 'Intelectual' },
  { codigo: '6', label: 'Mental / psicosocial' },
  { codigo: '7', label: 'Múltiple' },
  { codigo: '99', label: 'Otra' },
]

// =====================================================
// NIVEL ACADÉMICO — códigos MINTRAB
// =====================================================
export const NIVELES_ACADEMICOS: { codigo: string; label: string }[] = [
  { codigo: '1', label: 'Ninguno' },
  { codigo: '2', label: 'Pre-primaria' },
  { codigo: '3', label: 'Primaria incompleta' },
  { codigo: '4', label: 'Primaria completa' },
  { codigo: '5', label: 'Básico incompleto' },
  { codigo: '6', label: 'Básico completo' },
  { codigo: '7', label: 'Diversificado completo' },
  { codigo: '8', label: 'Universitario incompleto' },
  { codigo: '9', label: 'Universitario completo' },
  { codigo: '10', label: 'Postgrado' },
]

// =====================================================
// TEMPORALIDAD DEL CONTRATO — códigos MINTRAB
// =====================================================
export const TEMPORALIDAD_CONTRATO: { value: TemporalidadContratoType; label: string; codigoMintrab: string }[] = [
  { value: 'INDEFINIDO', label: 'Indefinido', codigoMintrab: '1' },
  { value: 'TEMPORAL', label: 'Temporal', codigoMintrab: '2' },
]

// =====================================================
// TIPO DE CONTRATO — códigos MINTRAB
// =====================================================
export const TIPOS_CONTRATO: { value: TipoContratoType; label: string; codigoMintrab: string }[] = [
  { value: 'PLANILLA', label: 'Planilla', codigoMintrab: '2' },
  { value: 'SERVICIOS', label: 'Servicios profesionales', codigoMintrab: '3' },
  { value: 'OTRO', label: 'Otro', codigoMintrab: '99' },
]

// =====================================================
// DEPARTAMENTOS INTERNOS DE ROTOTEC
// (no confundir con departamentos geográficos del país)
// =====================================================
export const DEPARTAMENTOS_ROTOTEC: { value: DepartamentoRototecType; label: string }[] = [
  { value: 'PRODUCCION', label: 'Producción' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'BODEGA_CEDIS', label: 'Bodega / CEDIS' },
  { value: 'BODEGA_ZACAPA', label: 'Bodega / Zacapa' },
  { value: 'VENTAS', label: 'Ventas' },
]

// =====================================================
// FORMA DE PAGO
// =====================================================
export const FORMAS_PAGO: { value: FormaPagoType; label: string }[] = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
]

// =====================================================
// FRECUENCIA DE PAGO — a qué planilla entra el colaborador
// =====================================================
export const FRECUENCIAS_PAGO: { value: FrecuenciaPagoType; label: string }[] = [
  { value: 'QUINCENAL', label: 'Quincenal' },
  { value: 'MENSUAL', label: 'Mensual' },
]
export const FRECUENCIA_PAGO_DEFAULT: FrecuenciaPagoType = 'QUINCENAL'

// =====================================================
// TIPO DE CUENTA BANCARIA
// =====================================================
export const TIPOS_CUENTA: { value: TipoCuentaType; label: string }[] = [
  { value: 'AHORRO', label: 'Ahorro' },
  { value: 'MONETARIA', label: 'Monetaria' },
]

// =====================================================
// TIPO DE BAJA
// =====================================================
export const TIPOS_BAJA: { value: TipoBajaType; label: string }[] = [
  { value: 'RENUNCIA', label: 'Renuncia' },
  { value: 'DESPIDO', label: 'Despido' },
  { value: 'ABANDONO', label: 'Abandono' },
  { value: 'DESPIDO JUSTIFICADO', label: 'Despido Justificado' }
]

// =====================================================
// CONSTANTES GENERALES
// =====================================================

// Piso de validación según el plan (Q2,500). El salario mínimo real es mayor;
// este valor existe solo para evitar datos claramente erróneos en el formulario.
export const SALARIO_BASE_MINIMO_VALIDACION = 2500

// Bonificación incentivo Decreto 78-89 / 37-2001 — FIJO por ley, NO editable.
// Aplica como Q125/quincena automáticamente en planilla.
export const BONIFICACION_INCENTIVO_LEY = 250

// Sucursal por defecto (sede principal de Rototec)
export const SUCURSAL_DEFAULT = 'KM 26.6 CARRETERA A EL SALVADOR'
