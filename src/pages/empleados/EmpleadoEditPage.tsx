import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/shared/report/report-ui'
import { Skeleton } from '@/components/ui/skeleton'
import { empleadoCreateSchema, type EmpleadoCreateValues } from '@/lib/validators'
import type { CreateEmpleadoInput, EmpleadoBackend } from '@/types'
import { useActualizarEmpleado, useEmpleadoBackend } from '@/hooks/useEmpleados'
import { extractApiErrorMessage } from '@/api/client'
import { StepContent } from './nuevo/wizardSteps'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { getInitials } from '@/lib/utils'

/** EmpleadoBackend (camelCase) → valores del formulario (snake_case del wizard). */
function aValoresForm(e: EmpleadoBackend): Partial<EmpleadoCreateValues> {
  const dia = (s: string | null) => (s ? s.slice(0, 10) : '')
  return {
    PAIS: e.pais ?? '',
    empresa_id: e.empresaId ?? undefined,
    id_departamento: e.idDepartamento ?? undefined,
    id_sub_departamento: e.idSubDepartamento ?? undefined,
    id_puesto: e.idPuesto ?? undefined,
    primer_nombre: e.primerNombre ?? '',
    segundo_nombre: e.segundoNombre ?? '',
    tercer_nombre: e.tercerNombre ?? '',
    primer_apellido: e.primerApellido ?? '',
    segundo_apellido: e.segundoApellido ?? '',
    apellido_casada: e.apellidoCasada ?? '',
    numero_identificacion_nacional: e.numeroIdentificacionNacional ?? '',
    id_tributario: e.idTributario ?? '',
    id_seguro_social: e.idSeguroSocial ?? '',
    fecha_nacimiento: dia(e.fechaNacimiento),
    sexo: e.sexo ?? '',
    estado_civil: e.estadoCivil ?? '',
    cantidad_hijos: e.cantidadHijos ?? 0,
    tipo_discapacidad: e.tipoDiscapacidad ?? '',
    telefono: e.telefono ?? '',
    correo: e.correo ?? '',
    direccion: e.direccion ?? '',
    pasaporte: e.pasaporte ?? '',
    pueblo_pertenencia: e.puebloPertenencia ?? '',
    comunidad_linguistica: e.comunidadLinguistica ?? '',
    grupo_etnico: e.grupoEtnico ?? '',
    lugar_nacimiento_municipio: e.lugarNacimientoMunicipio ?? '',
    permiso_extranjero: e.permisoExtranjero ?? '',
    jornada: e.jornada ?? '',
    temporalidad_contrato: e.temporalidadContrato ?? '',
    tipo_contrato: e.tipoContrato ?? '',
    fecha_contratacion: dia(e.fechaContratacion),
    fecha_reingreso: dia(e.fechaReingreso),
    salario_base_contrato: e.salarioBaseContrato ?? undefined,
    profesion: e.profesion ?? '',
    titulo: e.titulo ?? '',
    forma_pago: e.formaPago ?? 'TRANSFERENCIA',
    frecuencia_pago: e.frecuenciaPago === 'MENSUAL' ? 'MENSUAL' : 'QUINCENAL',
    codigo_banco: e.codigoBanco ?? '',
    numero_cuenta: e.numeroCuenta ?? '',
    tipo_cuenta: e.tipoCuenta ?? '',
    habilitar_horas_extra: e.habilitarHorasExtra ?? false,
    // Biométrico: el wizard lo exige al crear; en edición no aplica → dummies válidos que NO se envían.
    departamento_biotime: 1,
    ubicacion_biometrico: 1,
  }
}

/** Corre `reset` cuando `value` cambia, PERO no en el montaje (preserva el prefill). */
/**
 * Ejecuta `reset` solo cuando el valor CAMBIA respecto al anterior (no al montar).
 * Compara con el valor previo en vez de usar una bandera de "primera vez": en desarrollo React
 * (StrictMode) corre los efectos dos veces al montar y la bandera borraba la cascada precargada.
 * Se compara como texto porque los Select guardan "5" donde el valor inicial puede ser 5.
 */
function useResetOnChange(value: unknown, reset: () => void) {
  const previo = useRef(value)
  useEffect(() => {
    if (String(previo.current ?? '') === String(value ?? '')) return
    previo.current = value
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}

const SECCIONES = [
  { id: 'organizacion', titulo: 'Organización', icono: 'solar:structure-bold' },
  { id: 'personales', titulo: 'Datos personales', icono: 'solar:user-id-bold' },
  { id: 'culturales', titulo: 'Datos culturales', icono: 'solar:globus-bold' },
  { id: 'contrato', titulo: 'Contrato y pago', icono: 'solar:wallet-money-bold' },
] as const
type SeccionId = (typeof SECCIONES)[number]['id']

function Seccion({ id, children }: { id: SeccionId; children: React.ReactNode }) {
  const s = SECCIONES.find((x) => x.id === id)!
  return (
    // scroll-mt: al saltar desde el índice, la sección no queda tapada por el borde superior.
    <section id={`seccion-${id}`} className="scroll-mt-4">
      <Panel title={s.titulo} icon={s.icono}>
        {children}
      </Panel>
    </section>
  )
}

/** Nombre para el encabezado: partes del nombre o, si faltan (carga masiva), nombre + apellido. */
function nombreEmpleado(e: EmpleadoBackend) {
  const limpio = (v: string | null | undefined) => {
    const t = (v ?? '').trim()
    return /^(null|undefined)$/i.test(t) ? '' : t
  }
  const partes = [e.primerNombre, e.segundoNombre, e.tercerNombre, e.primerApellido, e.segundoApellido]
    .map(limpio)
    .filter(Boolean)
  return (partes.length ? partes : [limpio(e.nombre), limpio(e.apellido)].filter(Boolean)).join(' ') || `Empleado ${e.id}`
}

function EditForm({ id, empleado }: { id: string; empleado: EmpleadoBackend }) {
  const navigate = useNavigate()
  const mut = useActualizarEmpleado(id)
  const { options: puestoOptions } = usePuestoOptions()
  const form = useForm<EmpleadoCreateValues>({
    resolver: zodResolver(empleadoCreateSchema),
    mode: 'onTouched',
    defaultValues: aValoresForm(empleado),
  })

  // Cascada: cambiar un padre limpia a sus hijos (sin pisar el prefill en el montaje).
  useResetOnChange(form.watch('PAIS'), () => form.setValue('empresa_id', undefined as never, { shouldValidate: false }))
  useResetOnChange(form.watch('empresa_id'), () => {
    form.setValue('id_departamento', undefined as never)
    form.setValue('id_sub_departamento', undefined as never)
    form.setValue('id_puesto', undefined as never)
  })
  useResetOnChange(form.watch('id_departamento'), () => {
    form.setValue('id_sub_departamento', undefined as never)
    form.setValue('id_puesto', undefined as never)
  })
  useResetOnChange(form.watch('id_sub_departamento'), () => form.setValue('id_puesto', undefined as never))

  async function onSubmit(values: EmpleadoCreateValues) {
    // Quita los campos biométricos (solo creación) y los vacíos/NaN (el backend solo toca lo provisto).
    const { departamento_biotime: _d, ubicacion_biometrico: _u, posicion_biotime: _p, ...rest } = values
    const payload = Object.fromEntries(
      Object.entries(rest).filter(
        ([, v]) => v !== '' && v !== null && v !== undefined && !(typeof v === 'number' && Number.isNaN(v)),
      ),
    ) as Partial<CreateEmpleadoInput>
    try {
      await mut.mutateAsync(payload)
      toast.success('Empleado actualizado')
      navigate(`/empleados/${id}`)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  const nombre = nombreEmpleado(empleado)
  const puesto = puestoOptions.find((p) => p.id === empleado.idPuesto)?.nombre
  const { isDirty, dirtyFields } = form.formState
  const cambios = Object.keys(dirtyFields).length
  const volver = () => navigate(`/empleados/${id}`)
  const irA = (s: SeccionId) =>
    document.getElementById(`seccion-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-base font-bold text-white shadow-md">
              {getInitials(nombre.split(' ')[0], empleado.primerApellido || empleado.apellido || nombre.split(' ').at(-1))}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                <Icon icon="solar:pen-bold" width={12} />
                Editar empleado
              </p>
              <h1
                className="break-words text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl"
                data-testid="rh-empleado-editar__nombre"
              >
                {nombre}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-mono" title="Identificador interno en RRHH">
                  ID RRHH {empleado.id}
                </span>
                {puesto && (
                  <span className="flex items-center gap-1">
                    <Icon icon="solar:case-round-linear" width={13} />
                    {puesto}
                  </span>
                )}
                {empleado.codigoEmpleadoBio != null && (
                  <span className="flex items-center gap-1 font-mono" title="Código del reloj biométrico">
                    <Icon icon="solar:fingerprint-linear" width={13} />
                    BioTime {empleado.codigoEmpleadoBio}
                  </span>
                )}
                <EmpleadoStatusBadge estado={empleado.estaActivo ? 'ACTIVO' : 'BAJA'} />
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={volver}>
            <Icon icon="solar:alt-arrow-left-linear" />
            Volver a la ficha
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-200 pt-3">
          <span className="mr-1 text-xs text-slate-500">Ir a:</span>
          {SECCIONES.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => irA(sec.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
            >
              <Icon icon={sec.icono} width={13} />
              {sec.titulo}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">
            Los campos con <span className="font-semibold text-red-600">*</span> son obligatorios.
          </span>
        </div>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, () => toast.error('Revise los campos marcados en rojo'))} className="space-y-5">
          <Seccion id="organizacion">
            <div className="grid gap-4 sm:grid-cols-2">
              <StepContent index={0} />
              <StepContent index={1} />
              <StepContent index={2} />
              <StepContent index={3} />
              <StepContent index={4} />
            </div>
          </Seccion>
          <Seccion id="personales">
            <StepContent index={5} />
          </Seccion>
          <Seccion id="culturales">
            <StepContent index={6} />
          </Seccion>
          <Seccion id="contrato">
            <StepContent index={7} />
          </Seccion>

          <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="mr-auto min-w-0 text-xs">
              <div className="truncate text-slate-500">
                Editando a <span className="font-semibold text-slate-700">{nombre}</span>
              </div>
              {isDirty ? (
                <div className="flex items-center gap-1 font-medium text-amber-700" data-testid="rh-empleado-editar__sin-guardar">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {cambios} campo{cambios === 1 ? '' : 's'} modificado{cambios === 1 ? '' : 's'} sin guardar
                </div>
              ) : (
                <div className="text-slate-400">Sin cambios</div>
              )}
            </div>
            <Button type="button" variant="outline" onClick={volver} disabled={mut.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending || !isDirty} className="gap-2" title={!isDirty ? 'No hay cambios para guardar' : undefined}>
              <Icon icon={mut.isPending ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} />
              {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default function EmpleadoEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useEmpleadoBackend(id)

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-4xl rounded-2xl" />
  if (isError || !data || !id)
    return (
      <p className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        No se pudo cargar el empleado.
      </p>
    )
  return <EditForm id={id} empleado={data} />
}
