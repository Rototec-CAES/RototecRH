import type { EmpleadoCreateValues } from '@/lib/validators'

/**
 * "Ficha completa" del empleado: los datos OBLIGATORIOS del formulario de alta/edición.
 * Una sola definición para el listado (filtro "Ficha incompleta") y la pantalla de edición
 * (aviso "faltan N datos"), así los dos cuentan exactamente lo mismo.
 */
export const SECCIONES_FICHA = [
  { id: 'organizacion', titulo: 'Organización', icono: 'solar:structure-bold' },
  { id: 'personales', titulo: 'Datos personales', icono: 'solar:user-id-bold' },
  { id: 'culturales', titulo: 'Datos culturales', icono: 'solar:globus-bold' },
  { id: 'contrato', titulo: 'Contrato y pago', icono: 'solar:wallet-money-bold' },
] as const
export type SeccionFicha = (typeof SECCIONES_FICHA)[number]['id']

interface CampoFicha {
  seccion: SeccionFicha
  /** Nombre en el formulario (snake_case). */
  form: keyof EmpleadoCreateValues
  /** Nombre en la respuesta del backend (camelCase, GET /empleados). */
  api: string
  etiqueta: string
  /** Se puede completar por carga masiva (plantilla de Excel). */
  masiva: boolean
}

export const CAMPOS_FICHA: CampoFicha[] = [
  { seccion: 'organizacion', form: 'PAIS', api: 'pais', etiqueta: 'País', masiva: false },
  { seccion: 'organizacion', form: 'empresa_id', api: 'empresaId', etiqueta: 'Empresa', masiva: false },
  { seccion: 'organizacion', form: 'id_departamento', api: 'idDepartamento', etiqueta: 'Departamento', masiva: true },
  { seccion: 'organizacion', form: 'id_sub_departamento', api: 'idSubDepartamento', etiqueta: 'Sub-departamento', masiva: true },
  { seccion: 'organizacion', form: 'id_puesto', api: 'idPuesto', etiqueta: 'Puesto', masiva: true },
  { seccion: 'personales', form: 'primer_nombre', api: 'primerNombre', etiqueta: 'Primer nombre', masiva: true },
  { seccion: 'personales', form: 'primer_apellido', api: 'primerApellido', etiqueta: 'Primer apellido', masiva: true },
  { seccion: 'personales', form: 'numero_identificacion_nacional', api: 'numeroIdentificacionNacional', etiqueta: 'Documento de identificación', masiva: true },
  { seccion: 'personales', form: 'id_tributario', api: 'idTributario', etiqueta: 'NIT / ID tributario', masiva: true },
  { seccion: 'personales', form: 'id_seguro_social', api: 'idSeguroSocial', etiqueta: 'No. seguro social', masiva: true },
  { seccion: 'personales', form: 'fecha_nacimiento', api: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', masiva: true },
  { seccion: 'personales', form: 'sexo', api: 'sexo', etiqueta: 'Sexo', masiva: true },
  { seccion: 'personales', form: 'estado_civil', api: 'estadoCivil', etiqueta: 'Estado civil', masiva: true },
  { seccion: 'personales', form: 'tipo_discapacidad', api: 'tipoDiscapacidad', etiqueta: 'Tipo de discapacidad', masiva: true },
  { seccion: 'culturales', form: 'pueblo_pertenencia', api: 'puebloPertenencia', etiqueta: 'Pueblo de pertenencia', masiva: true },
  { seccion: 'culturales', form: 'comunidad_linguistica', api: 'comunidadLinguistica', etiqueta: 'Comunidad lingüística', masiva: true },
  { seccion: 'contrato', form: 'jornada', api: 'jornada', etiqueta: 'Jornada', masiva: true },
  { seccion: 'contrato', form: 'temporalidad_contrato', api: 'temporalidadContrato', etiqueta: 'Temporalidad', masiva: true },
  { seccion: 'contrato', form: 'tipo_contrato', api: 'tipoContrato', etiqueta: 'Tipo de contrato', masiva: true },
  { seccion: 'contrato', form: 'fecha_contratacion', api: 'fechaContratacion', etiqueta: 'Fecha de ingreso', masiva: true },
  { seccion: 'contrato', form: 'salario_base_contrato', api: 'salarioBaseContrato', etiqueta: 'Salario base', masiva: true },
  { seccion: 'contrato', form: 'forma_pago', api: 'formaPago', etiqueta: 'Forma de pago', masiva: true },
]

/** Vacío real; el TEXTO "null"/"undefined" que guardaron sistemas viejos también cuenta como vacío. */
export const vacioFicha = (v: unknown) =>
  v === undefined ||
  v === null ||
  (typeof v === 'string' && /^\s*(null|undefined)?\s*$/i.test(v)) ||
  (typeof v === 'number' && Number.isNaN(v))

export interface FaltantesFicha {
  total: number
  porSeccion: Record<SeccionFicha, string[]>
  /** Etiquetas de todo lo que falta, en orden. */
  lista: string[]
}

function armar(faltan: CampoFicha[]): FaltantesFicha {
  const porSeccion = Object.fromEntries(SECCIONES_FICHA.map((s) => [s.id, [] as string[]])) as Record<
    SeccionFicha,
    string[]
  >
  for (const c of faltan) porSeccion[c.seccion].push(c.etiqueta)
  return { total: faltan.length, porSeccion, lista: faltan.map((c) => c.etiqueta) }
}

/** Faltantes según los valores del FORMULARIO (pantalla de edición, en vivo). */
export function faltantesDesdeFormulario(valores: Partial<EmpleadoCreateValues>): FaltantesFicha {
  return armar(CAMPOS_FICHA.filter((c) => vacioFicha(valores[c.form])))
}

/** Puesto con su ubicación en la estructura (GET /organizacion/puestos). */
export interface PuestoUbicacion {
  id: number
  idSubdepartamento?: number | null
  idDepartamento?: number | null
}

/**
 * Sub-departamento (y departamento) que se deducen del puesto, si el empleado no los tiene.
 * Solo si es coherente: el departamento guardado (si hay) debe ser el del sub-departamento del puesto.
 */
export function ubicacionDesdePuesto(
  idPuesto: number | null | undefined,
  idDepartamento: number | null | undefined,
  puestos: PuestoUbicacion[] | undefined,
): { idSubDepartamento: number; idDepartamento: number | null } | null {
  if (idPuesto == null || !puestos) return null
  const p = puestos.find((x) => x.id === idPuesto)
  if (!p?.idSubdepartamento) return null
  if (idDepartamento != null && p.idDepartamento != null && idDepartamento !== p.idDepartamento) return null
  return { idSubDepartamento: p.idSubdepartamento, idDepartamento: idDepartamento ?? p.idDepartamento ?? null }
}

/**
 * Faltantes de un empleado del LISTADO (datos del backend), contando igual que la pantalla de edición:
 * - El nombre/apellido separados no cuentan si existe el completo (la edición los separa sola).
 * - El sub-departamento no cuenta si se deduce del puesto (la edición lo completa sola).
 */
export function faltantesDesdeEmpleado(e: object, puestos?: PuestoUbicacion[]): FaltantesFicha {
  const r = e as Record<string, unknown>
  const deducible = ubicacionDesdePuesto(
    r.idPuesto as number | null,
    r.idDepartamento as number | null,
    puestos,
  )
  return armar(
    CAMPOS_FICHA.filter((c) => {
      if (!vacioFicha(r[c.api])) return false
      if (c.form === 'primer_nombre') return vacioFicha(r.nombre)
      if (c.form === 'primer_apellido') return vacioFicha(r.apellido)
      if (c.form === 'id_sub_departamento' || c.form === 'id_departamento') return !deducible
      return true
    }),
  )
}
