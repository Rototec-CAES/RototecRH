import { useFormContext } from 'react-hook-form'
import {
  SEXOS,
  ESTADOS_CIVILES,
  PUEBLOS_GUATEMALA,
  COMUNIDADES_LINGUISTICAS,
  JORNADAS,
  TEMPORALIDAD_CONTRATO,
  TIPOS_CONTRATO,
  TIPOS_DISCAPACIDAD,
  FORMAS_PAGO,
  FRECUENCIAS_PAGO,
  TIPOS_CUENTA,
} from '@/constants/guatemala'
import {
  usePaises,
  useEmpresas,
  useDepartamentos,
  useSubDepartamentos,
  usePuestos,
} from '@/hooks/useCompanyCatalogos'
import { useBiotimeDepartamentos, useBiotimeUbicaciones } from '@/hooks/useBiotime'
import type { EmpleadoCreateValues } from '@/lib/validators'
import { CheckboxField, SelectField, TextField, type Opt } from './fields'

export const WIZARD_STEPS = [
  { id: 'pais', title: 'País' },
  { id: 'empresa', title: 'Empresa' },
  { id: 'departamento', title: 'Departamento' },
  { id: 'subdepartamento', title: 'Sub-departamento' },
  { id: 'puesto', title: 'Puesto' },
  { id: 'personales', title: 'Datos personales' },
  { id: 'culturales', title: 'Datos culturales' },
  { id: 'contrato', title: 'Contrato y pago' },
  { id: 'biometrico', title: 'Config. biométrico' },
]

/** Los Select guardan strings; el id real se normaliza al consumirlo (para la cascada). */
export const numOrUndef = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

// MINTRAB / bancos: se envía el identificador string del catálogo (.value/.codigo).
// Si el backend exige el codigoMintrab numérico, cambiar el `value` aquí.
const sexos: Opt[] = SEXOS.map((x) => ({ value: x.value, label: x.label }))
const estadosCiviles: Opt[] = ESTADOS_CIVILES.map((x) => ({ value: x.value, label: x.label }))
const pueblos: Opt[] = PUEBLOS_GUATEMALA.map((x) => ({ value: x.codigo, label: x.label }))
const comunidades: Opt[] = COMUNIDADES_LINGUISTICAS.map((x) => ({ value: x.codigo, label: x.label }))
const jornadas: Opt[] = JORNADAS.map((x) => ({ value: x.value, label: x.label }))
const temporalidades: Opt[] = TEMPORALIDAD_CONTRATO.map((x) => ({ value: x.value, label: x.label }))
const tiposContrato: Opt[] = TIPOS_CONTRATO.map((x) => ({ value: x.value, label: x.label }))
const discapacidades: Opt[] = TIPOS_DISCAPACIDAD.map((x) => ({ value: x.codigo, label: x.label }))
const formasPago: Opt[] = FORMAS_PAGO.map((x) => ({ value: x.value, label: x.label }))
const frecuenciasPago: Opt[] = FRECUENCIAS_PAGO.map((x) => ({ value: x.value, label: x.label }))
const tiposCuenta: Opt[] = TIPOS_CUENTA.map((x) => ({ value: x.value, label: x.label }))

const toOpt = (rows: { id: number; nombre: string }[] | undefined): Opt[] =>
  (rows ?? []).map((r) => ({ value: String(r.id), label: r.nombre }))

const grid = 'grid gap-4 sm:grid-cols-2'

/** Etiquetas de identificación / tributario / seguro social según país (keyName). */
const DOCUMENTOS_POR_PAIS: Record<
  string,
  { identificacion: string; tributario: string; seguroSocial: string }
> = {
  GT: { identificacion: 'DPI', tributario: 'NIT', seguroSocial: 'No. IGSS' },
  HN: { identificacion: 'DNI', tributario: 'RTN', seguroSocial: 'No. IHSS' },
  MX: { identificacion: 'CURP', tributario: 'RFC', seguroSocial: 'No. NSS (IMSS)' },
  SV: { identificacion: 'DUI', tributario: 'NIT', seguroSocial: 'No. ISSS' },
}
const DOCUMENTO_DEFAULT = {
  identificacion: 'Documento de identificación',
  tributario: 'ID tributario',
  seguroSocial: 'No. seguro social',
}

export function StepContent({ index }: { index: number }) {
  const { watch } = useFormContext<EmpleadoCreateValues>()
  const paisKey = watch('PAIS')
  const empresaId = numOrUndef(watch('empresa_id'))
  const departamentoId = numOrUndef(watch('id_departamento'))
  const subDepId = numOrUndef(watch('id_sub_departamento'))
  const esTransferencia = watch('forma_pago') === 'TRANSFERENCIA'

  const paises = usePaises()
  const paisId = paises.data?.find((p) => p.codigo === paisKey)?.id
  const empresas = useEmpresas(paisId)
  const departamentos = useDepartamentos(empresaId)
  const subDeps = useSubDepartamentos(departamentoId)
  const puestos = usePuestos(subDepId)
  const bioDeptos = useBiotimeDepartamentos()
  const bioUbic = useBiotimeUbicaciones()

  const docs = DOCUMENTOS_POR_PAIS[paisKey ?? ''] ?? DOCUMENTO_DEFAULT

  switch (index) {
    case 0:
      return (
        <SelectField
          name="PAIS"
          label="País"
          required
          loading={paises.isLoading}
          options={(paises.data ?? []).map((p) => ({ value: p.codigo, label: p.nombre }))}
        />
      )
    case 1:
      return (
        <SelectField
          name="empresa_id"
          label="Empresa"
          required
          loading={empresas.isLoading}
          disabled={!paisKey}
          options={toOpt(empresas.data)}
        />
      )
    case 2:
      return (
        <SelectField
          name="id_departamento"
          label="Departamento"
          required
          loading={departamentos.isLoading}
          disabled={!empresaId}
          options={toOpt(departamentos.data)}
        />
      )
    case 3:
      return (
        <SelectField
          name="id_sub_departamento"
          label="Sub-departamento"
          required
          loading={subDeps.isLoading}
          disabled={!departamentoId}
          options={toOpt(subDeps.data)}
        />
      )
    case 4:
      return (
        <SelectField
          name="id_puesto"
          label="Puesto"
          required
          loading={puestos.isLoading}
          disabled={!subDepId}
          options={toOpt(puestos.data)}
        />
      )
    case 5:
      return (
        <div className={grid}>
          <TextField name="primer_nombre" label="Primer nombre" required />
          <TextField name="segundo_nombre" label="Segundo nombre" />
          <TextField name="tercer_nombre" label="Tercer nombre" />
          <TextField name="primer_apellido" label="Primer apellido" required />
          <TextField name="segundo_apellido" label="Segundo apellido" />
          <TextField name="apellido_casada" label="Apellido de casada" />
          <TextField
            name="numero_identificacion_nacional"
            label={docs.identificacion}
            required
            placeholder={paisKey === 'GT' ? '13 dígitos' : undefined}
          />
          <TextField name="id_tributario" label={docs.tributario} required />
          <TextField name="id_seguro_social" label={docs.seguroSocial} required />
          <TextField name="fecha_nacimiento" label="Fecha de nacimiento" required type="date" />
          <SelectField name="sexo" label="Sexo" required options={sexos} />
          <SelectField name="estado_civil" label="Estado civil" required options={estadosCiviles} />
          <TextField name="cantidad_hijos" label="Cantidad de hijos" required type="number" />
          <SelectField name="tipo_discapacidad" label="Tipo de discapacidad" required options={discapacidades} />
          <TextField name="telefono" label="Teléfono" />
          <TextField name="correo" label="Correo" type="email" />
          <TextField name="direccion" label="Dirección" />
          <TextField name="pasaporte" label="Pasaporte" />
        </div>
      )
    case 6:
      return (
        <div className={grid}>
          <SelectField name="pueblo_pertenencia" label="Pueblo de pertenencia" required options={pueblos} />
          <SelectField name="comunidad_linguistica" label="Comunidad lingüística" required options={comunidades} />
          <TextField name="grupo_etnico" label="Grupo étnico" />
          <TextField name="lugar_nacimiento_municipio" label="Lugar de nacimiento (municipio)" />
          <TextField name="permiso_extranjero" label="Permiso/Expediente extranjero" />
        </div>
      )
    case 7:
      return (
        <div className={grid}>
          <SelectField name="jornada" label="Jornada" required options={jornadas} />
          <SelectField name="temporalidad_contrato" label="Temporalidad del contrato" required options={temporalidades} />
          <SelectField name="tipo_contrato" label="Tipo de contrato" required options={tiposContrato} />
          <TextField name="fecha_contratacion" label="Fecha de ingreso" required type="date" />
          <TextField name="fecha_reingreso" label="Fecha de reingreso" type="date" />
          <TextField name="salario_base_contrato" label="Salario base (Q)" required type="number" />
          <TextField name="profesion" label="Profesión" />
          <TextField name="titulo" label="Título / diploma" />
          <SelectField name="forma_pago" label="Forma de pago" required options={formasPago} />
          <SelectField name="frecuencia_pago" label="Tipo de nómina" required options={frecuenciasPago} />
          {/* Código único que el banco le da al colaborador para el enrollment; no es un catálogo de bancos. */}
          <TextField
            name="codigo_banco"
            label="Código de banco"
            placeholder="Código del colaborador en el banco"
            required={esTransferencia}
            disabled={!esTransferencia}
          />
          <TextField name="numero_cuenta" label="No. de cuenta" required={esTransferencia} disabled={!esTransferencia} />
          <SelectField
            name="tipo_cuenta"
            label="Tipo de cuenta"
            required={esTransferencia}
            disabled={!esTransferencia}
            options={tiposCuenta}
          />
          <div className="sm:col-span-2">
            <CheckboxField
              name="habilitar_horas_extra"
              label="Habilitar horas extra"
              hint="Calcula horas extra aunque no tenga rol de producción (carga General)"
            />
          </div>
        </div>
      )
    case 8:
      return (
        <div className={grid}>
          <SelectField
            name="departamento_biotime"
            label="Departamento (biométrico)"
            required
            loading={bioDeptos.isLoading}
            options={toOpt(bioDeptos.data)}
          />
          <SelectField
            name="ubicacion_biometrico"
            label="Ubicación / área (biométrico)"
            required
            loading={bioUbic.isLoading}
            options={toOpt(bioUbic.data)}
          />
        </div>
      )
    default:
      return null
  }
}
