export type TipoDocumentoType = 'DPI' | 'PASAPORTE' | 'OTRO'
export type JornadaType = 'DIURNA' | 'NOCTURNA'
export type SexoType = 'M' | 'F'
export type EstadoCivilType = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO' | 'UNION_LIBRE'
export type FormaPagoType = 'TRANSFERENCIA' | 'CHEQUE'
export type TipoCuentaType = 'AHORRO' | 'MONETARIA'
export type TemporalidadContratoType = 'INDEFINIDO' | 'TEMPORAL'
export type TipoContratoType = 'PLANILLA' | 'SERVICIOS' | 'OTRO'
export type EstadoEmpleadoType = 'ACTIVO' | 'BAJA'
export type TipoBajaType = 'RENUNCIA' | 'DESPIDO' | 'ABANDONO' | 'DESPIDO JUSTIFICADO'
export type TipoTurno = 'DIURNO' | 'NOCTURNO'
export type DepartamentoRototecType =
  | 'PRODUCCION'
  | 'BODEGA'
  | 'BODEGA_CEDIS'
  | 'BODEGA_ZACAPA'
  | 'VENTAS'

export interface Empleado {
  id: string

  // Identificación Personal
  primerNombre: string
  segundoNombre?: string
  tercerNombre?: string
  primerApellido: string
  segundoApellido?: string
  apellidoCasada?: string
  // Columnas legacy del backend; respaldo para mostrar el nombre si faltan las partes estructuradas.
  nombre?: string
  apellido?: string
  tipoDocumento: TipoDocumentoType
  dpi: string
  nit: string
  igss: string
  fechaNacimiento: string
  sexo: SexoType
  estadoCivil: EstadoCivilType
  cantidadHijos: number
  tipoDiscapacidad: string

  // Datos Culturales (MINTRAB)
  nacionalidad: string
  paisOrigen: string
  puebloPertenencia: string
  comunidadLinguistica: string
  lugarNacimientoMunicipio?: string
  permisoExtranjero?: string

  // Datos Laborales
  puesto: string
  departamento: DepartamentoRototecType
  // Árbol organizacional real (Fase C). Opcionales mientras el form migra a la cascada.
  empresaId?: number
  idDepartamento?: number
  idSubDepartamento?: number
  idPuesto?: number
  jornada: JornadaType
  temporalidadContrato: TemporalidadContratoType
  tipoContrato: TipoContratoType
  fechaIngreso: string
  fechaReingreso?: string
  salarioMensual: number
  sucursal: string
  nivelAcademico: string
  tituloProfesion?: string

  // Datos Bancarios
  formaPago: FormaPagoType
  codigoBanco?: string
  numeroCuenta?: string
  tipoCuenta?: TipoCuentaType

  // Estado / baja
  estado: EstadoEmpleadoType
  tipoBaja?: TipoBajaType
  fechaBaja?: string
  motivoBaja?: string
}

export type EmpleadoInput = Omit<Empleado, 'id' | 'estado' | 'tipoBaja' | 'fechaBaja' | 'motivoBaja'>

export interface BajaInput {
  tipoBaja: TipoBajaType
  fechaBaja: string
  motivoBaja: string
}

// =====================================================
// TURNOS — Catálogo de turnos productivos (Diurno / Nocturno).
// Los "turnos especiales" SIN TURNO / DESCANSO / SS son ESTADOS
// del día en el módulo de asistencias, no entradas de este catálogo.
// =====================================================
export interface Turno {
  id: string
  nombre: string
  tipo: TipoTurno
  horaEntrada: string             // 'HH:mm'
  horaSalida: string              // 'HH:mm' — puede ser <entrada si cruza medianoche
  incluyeHoraAlmuerzo: boolean
  horasPlanificadas: number       // (salida - entrada en h) - (almuerzo ? 1 : 0)
  horasUmbralExtras: number       // 44 diurno, 36 nocturno
  activo: boolean
}

export type TurnoInput = Omit<Turno, 'id' | 'horasPlanificadas' | 'horasUmbralExtras' | 'activo'>

// =====================================================
// ASIGNACIONES — historial de turno por empleado.
// Cada cambio de turno crea una nueva entrada con fecha de vigencia.
// El turno vigente es el más reciente (fechaVigencia <= hoy).
// =====================================================
export interface AsignacionTurno {
  id: string
  empleadoId: string
  turnoId: string
  fechaVigencia: string           // ISO date
  notas?: string
  fechaCreacion: string           // ISO datetime
}

export type AsignacionTurnoInput = Omit<AsignacionTurno, 'id' | 'fechaCreacion'>

// =====================================================
// AUSENCIAS — tipos extraídos del archivo real del cliente
// (REPORTE_DE_AUSENCIAS_Y_ATRASOS_-_OE.xlsx)
// =====================================================
export type TipoAusencia =
  | 'AUSENCIA_INJUSTIFICADA'
  | 'AUSENCIA_ENFERMEDAD_SIN_IGSS'
  | 'AUSENCIA_POR_IGSS'
  | 'AUSENCIA_MEDIO_DIA_IGSS'
  | 'SUSPENSION_AMONESTACION'
  | 'SUSPENSION_2_DIAS'
  | 'VACACIONES'
  | 'VACACIONES_TURNO_SUSPENDIDO'
  | 'MUERTE_FAMILIAR'
  | 'PENDIENTE'

export type MedidaDisciplinaria =
  | 'DESCUENTO_DIA_Y_SEPTIMO'
  | 'DESCONTAR_DIA_PAGA_IGSS'
  | 'DESCONTAR_EL_DIA'
  | 'DESCUENTO_2_DIAS_Y_SEPTIMO'
  | 'SIN_DESCUENTO'
  | 'PENDIENTE'
  | 'DESCUENTO_EN_NOMINA'  // sólo para atrasos

export interface Ausencia {
  id: string
  empleadoId: string
  fecha: string                   // ISO date YYYY-MM-DD
  tipoAusencia: TipoAusencia
  medidaDisciplinaria: MedidaDisciplinaria
  justificacion?: string
  presentoConstancia: boolean
  // Calculados al guardar (snapshot del cálculo en el momento)
  diasDescontados: number         // 0, 0.5, 1, 2
  descontarSeptimo: boolean       // se aplica una sola vez por semana
  pagaIGSS: boolean               // sólo AUSENCIA_POR_IGSS
  fechaCreacion: string
}

export type AusenciaInput = Omit<Ausencia, 'id' | 'medidaDisciplinaria' | 'diasDescontados' | 'descontarSeptimo' | 'pagaIGSS' | 'fechaCreacion'>

export interface Atraso {
  id: string
  empleadoId: string
  fecha: string
  horaEntradaReal: string         // HH:mm
  horaSalidaReal: string          // HH:mm
  turnoDescripcion?: string       // ej: "TURNO PROGRAMADO DE 09:00 A 18:00"
  minutosRetraso: number          // en MINUTOS enteros
  medidaDisciplinaria: MedidaDisciplinaria  // por defecto DESCUENTO_EN_NOMINA
  fechaCreacion: string
}

export type AtrasoInput = Omit<Atraso, 'id' | 'fechaCreacion'>

// =====================================================
// ASISTENCIAS
// Cinco estados de un día. Los estados especiales no suman horas trabajadas.
// =====================================================
export type TipoRegistroAsistencia =
  | 'MARCAJE'
  | 'DESCANSO'
  | 'SIN_SERVICIO'    // SS en el archivo del cliente
  | 'ALTA_PERIODO'    // ALTA P. — empleado entró en el período, no calcular extras
  | 'AUSENCIA'        // cruce con módulo de ausencias

export interface RegistroAsistencia {
  id: string
  empleadoId: string
  fecha: string                   // ISO YYYY-MM-DD
  tipoRegistro: TipoRegistroAsistencia
  // Snapshot del turno asignado al momento de registrar (para que el cálculo
  // sea estable aunque el catálogo cambie después).
  turnoIdAsignado?: string
  turnoEntradaAsignado?: string   // HH:mm
  turnoSalidaAsignado?: string    // HH:mm
  tipoTurnoAsignado?: TipoTurno   // DIURNO | NOCTURNO
  incluyeHoraAlmuerzo?: boolean
  // Marcaje real (sólo si tipoRegistro = MARCAJE)
  horaEntradaReal?: string        // HH:mm
  horaSalidaReal?: string         // HH:mm
  // Calculados al guardar
  horasTrabajadas: number         // (salidaReal - entradaReal) - almuerzo
  horasComida: number             // 1 si incluyeHoraAlmuerzo, 0 si no
  observaciones?: string
  fechaCreacion: string
}

export type RegistroAsistenciaInput = Omit<
  RegistroAsistencia,
  'id' | 'horasTrabajadas' | 'horasComida' | 'fechaCreacion'
>

// Verificación de asistencias: marcaje del biométrico vs. turno programado.
// Lo devuelve el MS de RRHH (GET /rrhh/asistencias/verificar). El recorte ya
// viene aplicado: horaEntrada/horaSalida son las horas "efectivas" (la real si
// se penaliza, la del turno si no), y horaEntradaReal es la marca cruda.
export type TipoTurnoVerificacion = 'acabados' | 'produccion'

export interface VerificacionAsistencia {
  idEmpleado: number
  nombre: string
  fecha: string                          // YYYY-MM-DD
  horaEntradaProgramada: string | null   // HH:mm — HoraInicio del turno
  horaEntradaReal: string | null         // HH:mm — marca real de entrada (sin recorte)
  horaEntrada: string | null             // HH:mm — efectiva (recortada al turno)
  horaSalidaProgramada: string | null    // HH:mm — HoraFin del turno
  horaSalida: string | null              // HH:mm — efectiva (recortada al turno)
  llegoTarde: boolean
  salioTemprano: boolean
  tipo: TipoTurnoVerificacion            // origen del turno
}

// Horas extra calculadas por el motor (réplica del Machote) — GET /rrhh/horas-extra/calcular.
// El periodo es una CATORCENA de 14 días anclada al primer día del rango consultado (no la
// quincena de calendario); un rango más largo se parte en catorcenas consecutivas.
export interface HorasExtraPeriodo {
  periodo: string                        // "AAAA-MM-DD..AAAA-MM-DD" (ej "2026-05-04..2026-05-17")
  dia: number                            // horas extra diurnas a pagar
  noche: number                          // horas extra nocturnas a pagar
  horasEfectivas: number                 // total de horas efectivas trabajadas
  ordinarias: number                     // horas ordinarias que correspondían
  excedente: number                      // efectivas − ordinarias (negativo = deben horas)
  sistemas: string[]                     // sistema(s) de turno usados (ej "0-5-2")
}

export type FuenteTurno = 'ACABADOS' | 'MAQUINAS' | 'PVC' | 'GENERAL'

export interface HorasExtraEmpleado {
  idEmpleado: number
  nombre?: string
  fuente?: FuenteTurno                    // acabados (tTurnosAcabados) | máquinas (tTurnosProduccionDetalle) | PVC (RHINOTEC.tTurnosPlanificacionPVC)
  periodos: HorasExtraPeriodo[]
}

// Empleado excluido del cálculo — GET /rrhh/horas-extra/excluidos.
export interface ExcluidoHE {
  idEmpleado: number
  nombre?: string
  fuente?: FuenteTurno
  razon: 'NO_MARCO'                       // tenía turno programado pero no marcó (no vino)
  diasProgramados: number                // días con turno en el rango pedido
}

// ===== Carga masiva de turnos (programacion-turnos) =====
export interface EmpleadoElegible {
  id: number
  codigo: number | null
  nombre: string                         // "Apellidos - Nombres"
  idPuesto: number
  cuadrilla: number | null
}
export interface PreviewFilaTurno {
  idEmpleado: number
  nombre: string                         // "Apellidos - Nombres"
  fecha: string
  tipo: string                           // DIA | NOCHE | DESCANSO | ASUETO
  horaInicio: string | null
  horaFin: string | null
  metaDia: number | null                 // solo Acabados: meta en minutos efectivos
  numTurno: number | null                // solo Máquinas: NumTurno efectivo (explícito o inferido)
  maquina: number | null                 // solo Máquinas: idMaquina
  equipo: number | null
  sistema: string | null
  errores: string[]
  avisos: string[]
}
export interface PreviewTurnos {
  idArea: number                         // área detectada del Excel (fuente de verdad para el diálogo)
  filas: PreviewFilaTurno[]
  totalErrores: number
  totalAvisos: number
}

// Desglose por semana de la catorcena — GET /rrhh/horas-extra/desglose.
// Réplica de las filas semanales del Resumen del Machote (cols H-W, sin multiplicador). Cada fila
// es un bloque de 7 días contado desde el primer día del rango (no lunes-domingo de calendario).
export interface DesgloseSemanaHE {
  periodo: string                        // catorcena "AAAA-MM-DD..AAAA-MM-DD"
  semana: number                         // 1 ó 2: posición dentro de la catorcena
  desde: string                          // primer día de la semana
  hasta: string                          // último día (recortado al final del rango)
  tipoSemana: 'completa' | 'parcial'     // parcial = última del rango, con menos de 7 días
  diasEnSemana: number
  horasEfectivas: number                 // col N
  ordinariasTotal: number                // col Q
  excedente: number                      // col R (pisado en 0)
  sistema: string                        // col S
  propDia: number                        // col T
  propNoche: number                      // col U
  saldoDia: number                       // col V (= propDia × excedente)
  saldoNoche: number                     // col W (= propNoche × excedente)
}

// Detalle día a día de un empleado — GET /rrhh/horas-extra/detalle.
export interface DetalleDiaHE {
  fecha: string                          // YYYY-MM-DD
  tipo: string                           // DIA | NOCHE | DESCANSO | ASUETO-D | ASUETO-N | AUSENTE (turno sin marca)
  ingreso: string                        // HH:mm:ss — ingreso oficial (validado)
  egreso: string                         // HH:mm:ss — egreso oficial
  efectivas: number                      // horas efectivas del día
  semana: number                         // 1 ó 2: semana dentro de la catorcena
  sistema: string                        // sistema de la semana (ej "0-5-2")
  periodo: string                        // catorcena "AAAA-MM-DD..AAAA-MM-DD"
  turnoIngreso: string | null            // programado
  turnoSalida: string | null
  marcaIngreso: string | null            // biométrico
  marcaSalida: string | null
  entradaDeltaMin: number | null         // marca − turno (entrada): + tarde, − antes
  salidaDeltaMin: number | null          // marca − turno (salida): + se quedó, − salió antes (solo diurna)
  entradaTarde: boolean                  // entró después del turno
  entradaAntes: boolean                  // entró bastante antes del turno
  salidaTarde: boolean                   // se fue después del fin de turno (solo diurna)
  salidaTemprano: boolean                // se fue antes del fin de turno (solo diurna)
  faltaMarca: boolean                    // día trabajado sin marca de entrada/salida
  marcaSinTurno: boolean                 // hubo marca pero no había turno programado
  marcaFueraDeTurno: boolean             // marca de entrada posterior al fin de un turno diurno
  inconsistente: boolean                 // hay alguna discrepancia que amerita revisión
  metaDia?: number | null                // meta del día (puntos acabados / kg producción)
  ejecutado?: number | null              // ejecutado del día (misma unidad que metaDia)
  cumplimientoPct?: number | null        // ejecutado/meta*100
  cumplioMeta?: boolean                  // alcanzó el 100% de la meta del día
  horarioAutorizado?: boolean            // horario programado = oficial por meta cumplida (condona llegada tarde y salida temprana)
  unidad?: 'puntos' | 'kg' | null        // unidad de meta/ejecutado
}

// Detalle día a día de un empleado, agrupado — GET /rrhh/horas-extra/detalle-todos (para el export).
export interface DetalleEmpleadoHE {
  idEmpleado: number
  nombre?: string
  fuente?: FuenteTurno
  dias: DetalleDiaHE[]
}

// Resumen semanal (lunes-domingo) por empleado.
export interface ResumenSemanal {
  empleadoId: string
  lunes: string                   // ISO YYYY-MM-DD
  horasTrabajadas: number
  horasExtrasDiurnas: number
  horasExtrasNocturnas: number
  calculoPorDia: boolean          // true si hubo mezcla de tipo de turno
}

// =====================================================
// PLANILLA — modelo consolidado (pre-planilla + planilla final)
// Una planilla por período (mes + quincena). Dos estados: BORRADOR / CERRADA.
// =====================================================
export type EstadoPlanilla = 'BORRADOR' | 'CERRADA'

export interface EmpleadoSnapshot {
  nombreCompleto: string          // formato APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2
  dpi: string
  nit: string
  igss: string
  puesto: string
  departamento: string            // string del enum (DEPARTAMENTOS_ROTOTEC)
  salarioMensual: number
  formaPago: FormaPagoType
  codigoBanco?: string
  numeroCuenta?: string
  tipoCuenta?: TipoCuentaType
  fechaIngreso: string
  estadoAlta: 'ACTIVO' | ''
  estadoContrato: 'ACTIVO' | ''
  fechaEgreso?: string
  tipoBaja?: TipoBajaType
}

// Campos que el usuario puede editar línea por línea cuando la planilla está en BORRADOR.
export interface LineaInputManual {
  // Horas extras (pre-llenadas desde Fase 4, editables)
  heSimplesDiurnas: number
  heSimplesMixtas: number
  heSimplesNocturnas: number
  heDobles: number
  // Descuentos manuales
  anticipoQuincenal: number
  descuento1: number
  descuento2: number
  embargos: number
  // Bonos manuales
  bonoProductividadAcabados: number
  bonoExtraordinario: number      // BONO DECRETO 37-2001 variable — NO es la bonificación de ley
  otrosIngresos: number
  bolsonBonificacionesMaquinas: number
  bonoRendimientoAcabados: number
  // ISR override (si está vacío usa la fórmula calculada)
  isrOverride?: number
}

export interface LineaPlanilla extends LineaInputManual {
  empleadoId: string
  empleadoSnapshot: EmpleadoSnapshot
  // Días e información del período
  diasDelMes: number              // 15 para quincena
  ausenciasDias: number           // suma diasDescontados + séptimos (del módulo de Ausencias)
  diasSuspensionIGSS: number      // count de AUSENCIA_POR_IGSS
  diasAPagar: number              // diasDelMes - ausenciasDias
  // Calculados
  sueldoPercibido: number
  bonificacionIncentivo: number   // Q125 quincenal fijo por ley
  valorHoraOrdinaria: number      // salario/30/8
  valorHoraExtraDiurna: number    // valorHoraOrdinaria × 1.5
  valorHoraExtraNocturna: number
  valorHoraExtraMixta: number
  valorHoraExtraDoble: number
  ingresoHorasDiurnas: number
  ingresoHorasNocturnas: number
  ingresoHorasMixtas: number
  ingresoHorasDobles: number
  totalIngresos: number
  igssLaboral: number             // sueldoPercibido × 4.83%
  isr: number
  totalDescuentos: number
  liquidoRecibir: number
  // Provisiones (para Contabilidad — no se descuentan del líquido)
  igssPatronal: number
  provisionIntecap: number
  provisionIrtra: number
  provisionAguinaldo: number
}

export interface TotalesPlanilla {
  cantidadEmpleados: number
  totalSueldoPercibido: number
  totalBonificacionIncentivo: number
  totalHorasExtras: number
  totalBonos: number
  totalIngresos: number
  totalIGSSLaboral: number
  totalISR: number
  totalDescuentos: number
  totalLiquido: number
  totalIGSSPatronal: number
  totalIntecap: number
  totalIrtra: number
  totalAguinaldo: number
}

export interface Planilla {
  id: string
  periodo: string                 // 'YYYY-MM-Q'  ej. '2026-05-1'
  desde: string                   // ISO date
  hasta: string                   // ISO date
  estado: EstadoPlanilla
  lineas: LineaPlanilla[]
  totales: TotalesPlanilla
  fechaGeneracion: string
  fechaCierre?: string
}

// =====================================================
// BONIFICACIONES — captura previa por empleado/período.
// Al generar planilla, las bonificaciones del período se suman al
// campo de LineaPlanilla correspondiente según su tipo.
// =====================================================
export type TipoBonificacion =
  | 'PRODUCCION_ACABADOS'
  | 'EXTRAORDINARIO_37_2001'
  | 'OTROS_INGRESOS'
  | 'BOLSON_MAQUINAS'
  | 'RENDIMIENTO_ACABADOS'
  | 'OTRO'

export interface Bonificacion {
  id: string
  empleadoId: string
  periodo: string                 // 'YYYY-MM-Q'
  tipo: TipoBonificacion
  monto: number
  descripcion?: string
  fechaCreacion: string
}

export type BonificacionInput = Omit<Bonificacion, 'id' | 'fechaCreacion'>

export interface BonificacionBatchInput {
  empleadoIds: string[]
  periodo: string
  tipo: TipoBonificacion
  monto: number
  descripcion?: string
}

// =====================================================
// ALTA DE EMPLEADO — contrato backend /rrhh (snake_case)
// =====================================================

/** Item genérico de catálogo de la cascada (company). Ajustar si el SP devuelve otras columnas. */
export interface CatalogoItem {
  id: number
  nombre: string
}

/** País del catálogo company (Id numérico para filtrar empresas + código keyName + nombre). */
export interface PaisItem {
  id: number
  codigo: string
  nombre: string
}

/** Item de catálogo de Biotime (departamento o área). */
export interface BiotimeItem {
  id: number
  nombre: string
}

/** Body de POST /rrhh/empleados — espejo de CreateEmployeeDto. */
export interface CreateEmpleadoInput {
  // cascada organizacional
  PAIS: string
  empresa_id: number
  id_departamento: number
  id_sub_departamento: number
  id_puesto: number
  // personales / documentos
  primer_nombre: string
  segundo_nombre?: string
  tercer_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
  apellido_casada?: string
  numero_identificacion_nacional: string
  id_tributario: string
  id_seguro_social: string
  fecha_nacimiento: string
  sexo: string
  estado_civil: string
  cantidad_hijos: number
  tipo_discapacidad: string
  telefono?: string
  correo?: string
  direccion?: string
  pasaporte?: string
  // culturales (MINTRAB)
  pueblo_pertenencia: string
  comunidad_linguistica: string
  grupo_etnico?: string
  lugar_nacimiento_municipio?: string
  permiso_extranjero?: string
  // contrato / pago
  jornada: string
  temporalidad_contrato: string
  tipo_contrato: string
  fecha_contratacion: string
  fecha_reingreso?: string
  salario_base_contrato: number
  profesion?: string
  titulo?: string
  forma_pago: string
  codigo_banco?: string
  numero_cuenta?: string
  tipo_cuenta?: string
  // biométrico
  departamento_biotime: number
  ubicacion_biometrico: number
  // horas extra
  habilitar_horas_extra?: boolean
}

/** Respuesta de POST /rrhh/empleados — entidad creada (camelCase del backend). */
export interface CreateEmpleadoResponse {
  id: number
  codigoEmpleadoBio: number | null
}

/** Empleado tal como lo devuelve el backend real (GET /rrhh/empleados), camelCase. */
export interface EmpleadoBackend {
  id: number
  nombre: string | null
  apellido: string | null
  telefono: string | null
  correo: string | null
  pais: string | null
  empresaId: number | null
  idDepartamento: number | null
  idSubDepartamento: number | null
  idPuesto: number | null
  codigoEmpleadoBio: number | null
  primerNombre: string | null
  segundoNombre: string | null
  tercerNombre: string | null
  primerApellido: string | null
  segundoApellido: string | null
  apellidoCasada: string | null
  estadoCivil: string | null
  sexo: string | null
  profesion: string | null
  titulo: string | null
  direccion: string | null
  fechaNacimiento: string | null
  fechaContratacion: string | null
  fechaReingreso: string | null
  estaActivo: boolean
  habilitarHorasExtra: boolean | null
  salarioBaseContrato: number | null
  bonificacionDecretoBaseContrato: number | null
  cantidadHijos: number | null
  jornada: string | null
  temporalidadContrato: string | null
  tipoContrato: string | null
  formaPago: string | null
  codigoBanco: string | null
  numeroCuenta: string | null
  tipoCuenta: string | null
  idTributario: string | null
  idSeguroSocial: string | null
  numeroIdentificacionNacional: string | null
  tipoDiscapacidad: string | null
  puebloPertenencia: string | null
  comunidadLinguistica: string | null
  grupoEtnico: string | null
  lugarNacimientoMunicipio: string | null
  permisoExtranjero: string | null
  pasaporte: string | null
  tipoBaja: string | null
  fechaBaja: string | null
  motivoBaja: string | null
}

// ───────── Ausencias (contrato backend /rrhh, modelo enriquecido) ─────────

/** Tipo de ausencia del catálogo (con sus reglas). GET /rrhh/ausencias/tipos */
export interface TipoAusenciaCatalogo {
  id: number
  nombre: string | null
  codigo: string | null
  descripcion: string | null
  medidaDefault: string | null
  diasDescontar: number
  descontarSeptimo: boolean
  pagaIGSS: boolean
  requiereConstancia: boolean
}

/** Ausencia tal como la devuelve el backend (camelCase de la entidad). */
export interface AusenciaBackend {
  id: number
  tipoAusencia: number
  idEmpleado: number
  fechaAusencia: string
  fechaSolicitudPermiso: string | null
  comentarios: string | null
  medidaDisciplinaria: string | null
  presentoConstancia: boolean
  diasDescontados: number
  descontarSeptimo: boolean
  pagaIGSS: boolean
  fechaCreacion: string | null
}

export interface CreateAusenciaInput {
  tipoAusencia: number
  idEmpleado: number
  fechaAusencia: string
  fechaSolicitudPermiso?: string
  presentoConstancia?: boolean
  comentarios?: string
}

export type UpdateAusenciaInput = Partial<Omit<CreateAusenciaInput, 'idEmpleado'>>

// =====================================================
// CAPACITACIONES
// =====================================================
export type EstadoModulo = 'Pendiente' | 'Aprobado' | 'No aprobado'

export interface Pensum {
  id: number
  nombre: string
  puesto: string | null
  idPuesto: number | null
}

export interface PensumTemaArbol {
  id: number
  tema: string | null
  modalidad: string | null
  recursos: string | null
}
export interface PensumModuloArbol {
  id: number
  modulo: string
  objetivo: string | null
  duracionHoras: number | null
  capacitador: number | null
  tipoEvaluacion: string | null
  instrumentos: string | null
  porcentajeAprobacion: number | null
  vigencia: number | null
  bono: boolean | null
  temas: PensumTemaArbol[]
}
export interface PensumArbol {
  id: number
  nombre: string
  puesto: string | null
  idPuesto: number | null
  modulos: PensumModuloArbol[]
}

export interface PensumInput {
  nombre: string
  puesto?: string
  idPuesto?: number
}
export interface ModuloInput {
  modulo: string
  objetivo?: string
  duracionHoras?: number
  capacitador?: number
  tipoEvaluacion?: string
  instrumentos?: string
  porcentajeAprobacion?: number
  vigencia?: number
  bono?: boolean
}
export interface TemaInput {
  tema: string
  modalidad?: string
  recursos?: string
}

export interface Respuesta {
  id: number
  idPregunta: number
  respuesta: string
  respuestaCorrecta: boolean | null
}
export interface Pregunta {
  id: number
  idEvaluacion: number
  pregunta: string
  puntosPorRespuesta: number | null
  idTema: number | null
  respuestas: Respuesta[]
}
export interface Evaluacion {
  id: number
  idModulo: number
  nombre: string | null
}
export interface EvaluacionDetalle {
  evaluacion: Evaluacion
  preguntas: Pregunta[]
}

export interface EvaluacionInput {
  idModulo: number
  nombre?: string
}
export interface PreguntaInput {
  pregunta: string
  puntosPorRespuesta?: number
  idTema?: number
}
export interface RespuestaInput {
  respuesta: string
  respuestaCorrecta?: boolean
}

export interface EmpleadoCapResumen {
  empleadoId: number
  nombre: string
  idPuesto: number | null
  idDepartamento: number | null
  estaActivo: boolean
  modulosTotal: number
  modulosAprobados: number
  licenciaActiva: boolean
  licenciaEstado: 'activa' | 'expirada' | 'sin_licencia'
  puestoNombre?: string | null
  capacitacionNombre?: string | null
}
export interface AsignacionDetalleCap {
  id: number
  idModulo: number
  puntuacion: number | null
  estado: string
  intentos: number
}
export interface AsignacionCap {
  id: number
  idPensum: number
  tipo: string
  licenciaActiva: boolean
  venceLicencia: string | null
  fechaFinaliza: string | null
  detalles: AsignacionDetalleCap[]
}
export interface EmpleadoCapDetalle {
  empleadoId: number
  asignaciones: AsignacionCap[]
}

export interface GenerarExamenInput {
  idAsignacionDetalle: number
  horasVigencia?: number
}
export interface GenerarExamenResult {
  token: string
  url: string
}

export interface ExamenOpcion {
  idRespuesta: number
  respuesta: string
}
export interface ExamenPreguntaPublica {
  idPregunta: number
  pregunta: string
  puntos: number | null
  opciones: ExamenOpcion[]
}
export interface ExamenPublico {
  idEvaluacion: number
  nombre: string | null
  preguntas: ExamenPreguntaPublica[]
}
export interface EnviarRespuestasInput {
  respuestas: { idPregunta: number; idRespuesta: number | null }[]
}
export interface ResultadoExamen {
  puntaje: number
  aprobado: boolean
  estado: EstadoModulo
}

// ─── Capacitaciones: elegibles & reabrir ─────────────────────────────────────
export interface EmpleadoCapElegible {
  empleadoId: number
  nombre: string
  idPuesto: number
  idPensum: number
  puestoNombre?: string | null
  pensumNombre?: string | null
}

export interface ReabrirInput {
  idModulos?: number[]
}

export interface ReabrirResult {
  asignacionId: number
  reseteados: number
  licenciaActiva: boolean
  venceLicencia: string | null
}
