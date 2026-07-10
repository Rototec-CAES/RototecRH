import { z } from 'zod'
import {
  BANCOS_GUATEMALA,
  SALARIO_BASE_MINIMO_VALIDACION,
  TIPOS_BAJA,
} from '@/constants/guatemala'

const dpiRegex = /^\d{13}$/
const nitRegex = /^\d{3,13}K?$/i

const enumValues = <T extends { value: string }>(arr: readonly T[]) =>
  arr.map((x) => x.value) as [T['value'], ...T['value'][]]

const isoDate = z
  .string()
  .min(1, 'Requerido')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Fecha inválida')

export const empleadoSchema = z
  .object({
    // -------- Identificación Personal --------
    primerNombre: z.string().min(1, 'Requerido').max(60),
    segundoNombre: z.string().max(60).optional().or(z.literal('')),
    tercerNombre: z.string().max(60).optional().or(z.literal('')),
    primerApellido: z.string().min(1, 'Requerido').max(60),
    segundoApellido: z.string().max(60).optional().or(z.literal('')),
    apellidoCasada: z.string().max(60).optional().or(z.literal('')),
    tipoDocumento: z.string().min(1, 'Requerido'),
    dpi: z.string().regex(dpiRegex, 'El DPI debe tener exactamente 13 dígitos'),
    nit: z
      .string()
      .min(1, 'Requerido')
      .regex(nitRegex, 'NIT inválido (sólo dígitos, opcionalmente K al final)'),
    igss: z.string().min(1, 'Requerido'),
    fechaNacimiento: isoDate,
    sexo: z.string().min(1, 'Requerido'),
    estadoCivil: z.string().min(1, 'Requerido'),
    cantidadHijos: z.coerce.number().int().min(0).max(30),
    tipoDiscapacidad: z.string().min(1, 'Requerido'),

    // -------- Datos Culturales (MINTRAB) --------
    nacionalidad: z.string().min(1, 'Requerido'),
    paisOrigen: z.string().min(1, 'Requerido'),
    puebloPertenencia: z.string().min(1, 'Requerido'),
    comunidadLinguistica: z.string().min(1, 'Requerido'),
    lugarNacimientoMunicipio: z.string().max(80).optional().or(z.literal('')),
    permisoExtranjero: z.string().max(40).optional().or(z.literal('')),

    // -------- Datos Laborales --------
    puesto: z.string().min(1, 'Requerido').max(80),
    departamento: z.string().min(1, 'Requerido'),
    jornada: z.string().min(1, 'Requerido'),
    temporalidadContrato: z.string().min(1, 'Requerido'),
    tipoContrato: z.string().min(1, 'Requerido'),
    fechaIngreso: isoDate.refine(
      (v) => new Date(v).getTime() <= Date.now(),
      'La fecha de ingreso no puede ser futura',
    ),
    fechaReingreso: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        'Fecha inválida',
      ),
    salarioMensual: z.coerce
      .number()
      .min(SALARIO_BASE_MINIMO_VALIDACION, `Mínimo Q${SALARIO_BASE_MINIMO_VALIDACION}`),
    sucursal: z.string().min(1, 'Requerido').max(120),
    nivelAcademico: z.string().min(1, 'Requerido'),
    tituloProfesion: z.string().max(120).optional().or(z.literal('')),

    // -------- Datos Bancarios --------
    formaPago: z.string().min(1, 'Requerido'),
    codigoBanco: z.string().optional().or(z.literal('')),
    numeroCuenta: z.string().optional().or(z.literal('')),
    tipoCuenta: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.formaPago === 'TRANSFERENCIA') {
      if (!data.codigoBanco) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['codigoBanco'],
          message: 'Requerido para pago por transferencia',
        })
      }
      if (!data.numeroCuenta || data.numeroCuenta.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numeroCuenta'],
          message: 'Número de cuenta requerido',
        })
      }
      if (!data.tipoCuenta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tipoCuenta'],
          message: 'Selecciona tipo de cuenta',
        })
      }
    }
  })

export type EmpleadoFormValues = z.infer<typeof empleadoSchema>

export const bajaSchema = z.object({
  tipoBaja: z.enum(enumValues(TIPOS_BAJA)),
  fechaBaja: isoDate,
  motivoBaja: z.string().min(3, 'Indica el motivo'),
})

export type BajaFormValues = z.infer<typeof bajaSchema>

// =====================================================
// TURNOS
// =====================================================
const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const turnoSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(60),
  tipo: z.enum(['DIURNO', 'NOCTURNO']),
  horaEntrada: z.string().regex(horaRegex, 'Formato HH:mm'),
  horaSalida: z.string().regex(horaRegex, 'Formato HH:mm'),
  incluyeHoraAlmuerzo: z.boolean(),
})

export type TurnoFormValues = z.infer<typeof turnoSchema>

export const asignacionTurnoSchema = z.object({
  turnoId: z.string().min(1, 'Selecciona un turno'),
  fechaVigencia: isoDate,
  notas: z.string().max(200).optional().or(z.literal('')),
})

export type AsignacionTurnoFormValues = z.infer<typeof asignacionTurnoSchema>

// =====================================================
// AUSENCIAS Y ATRASOS
// =====================================================
const TIPOS_AUSENCIA_VALUES = [
  'AUSENCIA_INJUSTIFICADA',
  'AUSENCIA_ENFERMEDAD_SIN_IGSS',
  'AUSENCIA_POR_IGSS',
  'AUSENCIA_MEDIO_DIA_IGSS',
  'SUSPENSION_AMONESTACION',
  'SUSPENSION_2_DIAS',
  'VACACIONES',
  'VACACIONES_TURNO_SUSPENDIDO',
  'MUERTE_FAMILIAR',
  'PENDIENTE',
] as const

export const ausenciaSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  fecha: isoDate,
  tipoAusencia: z.enum(TIPOS_AUSENCIA_VALUES),
  presentoConstancia: z.boolean(),
  justificacion: z.string().max(500).optional().or(z.literal('')),
})

export type AusenciaFormValues = z.infer<typeof ausenciaSchema>

// Alta/edición de ausencia contra el backend nuevo (tipo = id del catálogo).
export const ausenciaCreateSchema = z.object({
  idEmpleado: z.coerce.number().int().positive('Selecciona un empleado'),
  tipoAusencia: z.coerce.number().int().positive('Selecciona un tipo'),
  fechaAusencia: isoDate,
  fechaSolicitudPermiso: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), 'Fecha inválida'),
  presentoConstancia: z.boolean(),
  comentarios: z.string().max(255).optional().or(z.literal('')),
})

export type AusenciaCreateValues = z.infer<typeof ausenciaCreateSchema>

const TIPOS_REGISTRO_ASISTENCIA = [
  'MARCAJE',
  'DESCANSO',
  'SIN_SERVICIO',
  'ALTA_PERIODO',
  'AUSENCIA',
] as const

export const asistenciaSchema = z
  .object({
    empleadoId: z.string().min(1, 'Selecciona un empleado'),
    fecha: isoDate,
    tipoRegistro: z.enum(TIPOS_REGISTRO_ASISTENCIA),
    horaEntradaReal: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || horaRegex.test(v), 'Formato HH:mm'),
    horaSalidaReal: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || horaRegex.test(v), 'Formato HH:mm'),
    observaciones: z.string().max(200).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.tipoRegistro === 'MARCAJE') {
      if (!data.horaEntradaReal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['horaEntradaReal'],
          message: 'Requerido para marcaje',
        })
      }
      if (!data.horaSalidaReal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['horaSalidaReal'],
          message: 'Requerido para marcaje',
        })
      }
    }
  })

export type AsistenciaFormValues = z.infer<typeof asistenciaSchema>

export const atrasoSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  fecha: isoDate,
  horaEntradaReal: z.string().regex(horaRegex, 'Formato HH:mm'),
  horaSalidaReal: z.string().regex(horaRegex, 'Formato HH:mm'),
  turnoDescripcion: z.string().max(120).optional().or(z.literal('')),
  minutosRetraso: z.coerce.number().int().min(0).max(24 * 60),
})

export type AtrasoFormValues = z.infer<typeof atrasoSchema>

// =====================================================
// BONIFICACIONES
// =====================================================
const TIPOS_BONIFICACION_VALUES = [
  'PRODUCCION_ACABADOS',
  'EXTRAORDINARIO_37_2001',
  'OTROS_INGRESOS',
  'BOLSON_MAQUINAS',
  'RENDIMIENTO_ACABADOS',
  'OTRO',
] as const

const periodoRegex = /^\d{4}-\d{2}-[12]$/

export const bonificacionSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  periodo: z.string().regex(periodoRegex, 'Período inválido'),
  tipo: z.enum(TIPOS_BONIFICACION_VALUES),
  monto: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
})

export type BonificacionFormValues = z.infer<typeof bonificacionSchema>

export const bonificacionBatchSchema = z.object({
  empleadoIds: z.array(z.string()).min(1, 'Selecciona al menos un empleado'),
  periodo: z.string().regex(periodoRegex, 'Período inválido'),
  tipo: z.enum(TIPOS_BONIFICACION_VALUES),
  monto: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
})

export type BonificacionBatchFormValues = z.infer<typeof bonificacionBatchSchema>

// =====================================================
// AUTH
// =====================================================
export const loginSchema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export { BANCOS_GUATEMALA }

// =====================================================
// ALTA DE EMPLEADO — wizard (contrato /rrhh, snake_case)
// =====================================================
const reqStr = (msg = 'Requerido') => z.string().min(1, msg)
const optStr = (max: number) => z.string().max(max).optional().or(z.literal(''))
// Los Select guardan string (o vacío). Normalizamos y damos un mensaje amable
// en vez del "Expected number, received nan" por defecto de z.coerce.number().
const reqId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ required_error: 'Selecciona una opción', invalid_type_error: 'Selecciona una opción' })
    .int()
    .positive('Selecciona una opción'),
)

export const empleadoCreateSchema = z
  .object({
    // cascada
    PAIS: reqStr('Selecciona el país'),
    empresa_id: reqId,
    id_departamento: reqId,
    id_sub_departamento: reqId,
    id_puesto: reqId,
    // personales / documentos
    primer_nombre: reqStr().max(50),
    segundo_nombre: optStr(50),
    tercer_nombre: optStr(50),
    primer_apellido: reqStr().max(50),
    segundo_apellido: optStr(50),
    apellido_casada: optStr(50),
    numero_identificacion_nacional: reqStr('Requerido'),
    id_tributario: reqStr('Requerido'),
    id_seguro_social: reqStr('Requerido').max(30),
    fecha_nacimiento: isoDate.refine((v) => {
      const nacimiento = new Date(v)
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 17)
      return nacimiento <= cutoff
    }, 'El empleado debe tener al menos 17 años'),
    sexo: reqStr('Selecciona el sexo'),
    estado_civil: reqStr('Selecciona el estado civil'),
    cantidad_hijos: z.coerce.number().int().min(0).max(30),
    tipo_discapacidad: reqStr('Selecciona una opción'),
    telefono: optStr(30),
    correo: z.string().email('Correo inválido').max(255).optional().or(z.literal('')),
    direccion: optStr(200),
    pasaporte: optStr(30),
    // culturales
    pueblo_pertenencia: reqStr('Selecciona una opción'),
    comunidad_linguistica: reqStr('Selecciona una opción'),
    grupo_etnico: optStr(20),
    lugar_nacimiento_municipio: optStr(80),
    permiso_extranjero: optStr(40),
    // contrato / pago
    jornada: reqStr('Selecciona la jornada'),
    temporalidad_contrato: reqStr('Selecciona una opción'),
    tipo_contrato: reqStr('Selecciona una opción'),
    // La fecha de contratación puede ser futura (contrataciones programadas).
    fecha_contratacion: isoDate,
    fecha_reingreso: z.string().optional().or(z.literal('')).refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      'Fecha inválida',
    ),
    salario_base_contrato: z.coerce.number().min(1000, 'Mínimo Q1,000'),
    profesion: optStr(100),
    titulo: optStr(60),
    forma_pago: reqStr('Selecciona la forma de pago'),
    codigo_banco: z.string().optional().or(z.literal('')),
    numero_cuenta: z.string().optional().or(z.literal('')),
    tipo_cuenta: z.string().optional().or(z.literal('')),
    // biométrico
    departamento_biotime: reqId,
    ubicacion_biometrico: reqId,
    // horas extra
    habilitar_horas_extra: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // Formato estricto de documentos solo para Guatemala (otros países: solo requerido).
    if (data.PAIS === 'GT') {
      if (!dpiRegex.test(data.numero_identificacion_nacional))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numero_identificacion_nacional'],
          message: 'El DPI debe tener exactamente 13 dígitos',
        })
      if (!nitRegex.test(data.id_tributario))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['id_tributario'],
          message: 'NIT inválido (dígitos, opcional K final)',
        })
    }
    if (data.forma_pago === 'TRANSFERENCIA') {
      if (!data.codigo_banco)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['codigo_banco'], message: 'Requerido para transferencia' })
      if (!data.numero_cuenta || data.numero_cuenta.trim().length < 4)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numero_cuenta'], message: 'Número de cuenta requerido' })
      if (!data.tipo_cuenta)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tipo_cuenta'], message: 'Selecciona tipo de cuenta' })
    }
  })

export type EmpleadoCreateValues = z.infer<typeof empleadoCreateSchema>

/** Campos de cada paso (para form.trigger por paso). Índice = nº de paso - 1. */
export const WIZARD_STEP_FIELDS: (keyof EmpleadoCreateValues)[][] = [
  ['PAIS'],
  ['empresa_id'],
  ['id_departamento'],
  ['id_sub_departamento'],
  ['id_puesto'],
  ['primer_nombre', 'segundo_nombre', 'tercer_nombre', 'primer_apellido', 'segundo_apellido', 'apellido_casada',
   'numero_identificacion_nacional', 'id_tributario', 'id_seguro_social', 'fecha_nacimiento', 'sexo', 'estado_civil',
   'cantidad_hijos', 'tipo_discapacidad', 'telefono', 'correo', 'direccion', 'pasaporte'],
  ['pueblo_pertenencia', 'comunidad_linguistica', 'grupo_etnico', 'lugar_nacimiento_municipio', 'permiso_extranjero'],
  ['jornada', 'temporalidad_contrato', 'tipo_contrato', 'fecha_contratacion', 'fecha_reingreso',
   'salario_base_contrato', 'profesion', 'titulo', 'forma_pago', 'codigo_banco', 'numero_cuenta', 'tipo_cuenta',
   'habilitar_horas_extra'],
  ['departamento_biotime', 'ubicacion_biometrico'],
]

// =====================================================
// CAPACITACIONES
// =====================================================
const optStrCap = (max = 200) => z.string().max(max).optional().or(z.literal(''))
// Convierte '' / null / undefined → undefined antes de parsear; así z.optional() sí aplica.
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    schema.optional(),
  )

export const pensumSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120),
  idPuesto: z.coerce.number().int().positive({ message: 'Selecciona un puesto' }),
  puesto: optStrCap(120),
})
export type PensumFormValues = z.infer<typeof pensumSchema>

export const moduloSchema = z.object({
  modulo: z.string().min(1, 'Requerido').max(160),
  objetivo: optStr(500),
  duracionHoras: optionalNumber(z.coerce.number().min(0).max(999)),
  capacitador: optionalNumber(z.coerce.number().int().positive()),
  tipoEvaluacion: optStr(80),
  instrumentos: optStr(300),
  porcentajeAprobacion: optionalNumber(z.coerce.number().min(0).max(100)),
  vigencia: optionalNumber(z.coerce.number().int().min(0).max(120)),
  bono: z.boolean().optional(),
})
export type ModuloFormValues = z.infer<typeof moduloSchema>

export const temaSchema = z.object({
  tema: z.string().min(1, 'Requerido').max(200),
  modalidad: optStr(80),
  recursos: optStr(300),
})
export type TemaFormValues = z.infer<typeof temaSchema>

export const evaluacionSchema = z.object({
  nombre: optStr(160),
})
export type EvaluacionFormValues = z.infer<typeof evaluacionSchema>

export const preguntaSchema = z.object({
  pregunta: z.string().min(1, 'Requerido').max(500),
  puntosPorRespuesta: optionalNumber(z.coerce.number().min(0).max(100)),
  idTema: optionalNumber(z.coerce.number().int().positive()),
})
export type PreguntaFormValues = z.infer<typeof preguntaSchema>

export const respuestaSchema = z.object({
  respuesta: z.string().min(1, 'Requerido').max(300),
  respuestaCorrecta: z.boolean().optional(),
})
export type RespuestaFormValues = z.infer<typeof respuestaSchema>

export const asignacionSecundariaSchema = z.object({
  idPensum: z.coerce.number().int().positive('Selecciona un pensum'),
})
export type AsignacionSecundariaFormValues = z.infer<typeof asignacionSecundariaSchema>

export const generarExamenSchema = z.object({
  horasVigencia: optionalNumber(z.coerce.number().int().min(1).max(720)),
})
export type GenerarExamenFormValues = z.infer<typeof generarExamenSchema>
