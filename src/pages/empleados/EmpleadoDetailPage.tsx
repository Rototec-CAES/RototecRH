import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DetailAction, DetailChip, DetailHeader } from '@/components/shared/DetailHeader'
import { Panel } from '@/shared/report/report-ui'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadoBackend, useHuellasBiotime, useReactivar } from '@/hooks/useEmpleados'
import { formatFechaHuella, infoBiometrico } from '@/lib/biometrico'
import {
  usePaises,
  useEmpresas,
  useDepartamentos,
  useSubDepartamentos,
  usePuestos,
} from '@/hooks/useCompanyCatalogos'
import {
  SEXOS,
  ESTADOS_CIVILES,
  TIPOS_DISCAPACIDAD,
  PUEBLOS_GUATEMALA,
  COMUNIDADES_LINGUISTICAS,
} from '@/constants/guatemala'
import { BajaDialog } from './BajaDialog'
import { RegistrarBiometricoDialog } from './RegistrarBiometricoDialog'
import type { EmpleadoBackend } from '@/types'
import { usePermisos } from '@/hooks/usePermisos'

/** Mapea un código/valor guardado a su etiqueta de catálogo (acepta value/codigo/codigoMintrab). */
function labelDe(
  items: readonly { label: string; value?: string; codigo?: string; codigoMintrab?: string }[],
  v: string | null,
): string {
  if (!v) return '—'
  return items.find((i) => i.value === v || i.codigo === v || i.codigoMintrab === v)?.label ?? v
}

/** Limpia una parte de nombre: null/undefined/'' y los literales 'null'/'undefined' → ''. */
const limpioNombre = (v: string | null | undefined): string => {
  const s = (v ?? '').trim()
  return /^(null|undefined)$/i.test(s) ? '' : s
}

function displayName(e: EmpleadoBackend): string {
  return nombreParaMostrar({
    primerNombre: limpioNombre(e.primerNombre) || limpioNombre(e.nombre),
    segundoNombre: limpioNombre(e.segundoNombre) || undefined,
    tercerNombre: limpioNombre(e.tercerNombre) || undefined,
    primerApellido: limpioNombre(e.primerApellido) || limpioNombre(e.apellido),
    segundoApellido: limpioNombre(e.segundoApellido) || undefined,
    apellidoCasada: limpioNombre(e.apellidoCasada) || undefined,
  })
}

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmpleadoBackend(id)
  const reactivar = useReactivar(id ?? '')
  const [bajaOpen, setBajaOpen] = useState(false)
  const [bioOpen, setBioOpen] = useState(false)
  const huellasQ = useHuellasBiotime()
  const { puede } = usePermisos()
  const verSueldos = puede('rrhh.empleados', 'ver_salarios')

  // Resolución de nombres de catálogo (cacheado por TanStack Query).
  // La empresa se busca dentro del país del propio empleado (paisId real, sin depender del SP con NULL).
  const paises = usePaises()
  const paisIdEmpleado = paises.data?.find((p) => p.codigo === data?.pais)?.id
  const empresas = useEmpresas(paisIdEmpleado)
  const departamentos = useDepartamentos(data?.empresaId ?? undefined)
  const subDeps = useSubDepartamentos(data?.idDepartamento ?? undefined)
  const puestos = usePuestos(data?.idSubDepartamento ?? undefined)

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <Icon icon="solar:danger-triangle-bold" width={18} />
        <AlertTitle>No se pudo cargar el empleado</AlertTitle>
        <AlertDescription>
          Verifica el identificador.{' '}
          <Link to="/empleados" className="font-semibold underline">
            Volver al listado
          </Link>
          .
        </AlertDescription>
      </Alert>
    )
  }

  async function copiarCodigoBio(codigo: number) {
    try {
      await navigator.clipboard.writeText(String(codigo))
      toast.success(`Código BioTime ${codigo} copiado`)
    } catch {
      toast.error('No se pudo copiar; cópielo manualmente')
    }
  }

  async function onReactivar() {
    try {
      await reactivar.mutateAsync()
      toast.success('Empleado reactivado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const nombreDisplay = displayName(data)
  const bio = infoBiometrico(
    data.codigoEmpleadoBio,
    data.estaActivo,
    huellasQ.data ? new Map(huellasQ.data.map((h) => [h.codigoBio, h])) : undefined,
  )
  const empresaNombre = empresas.data?.find((e) => e.id === data.empresaId)?.nombre ?? '—'
  const deptoNombre = departamentos.data?.find((d) => d.id === data.idDepartamento)?.nombre ?? '—'
  const subDeptoNombre = subDeps.data?.find((s) => s.id === data.idSubDepartamento)?.nombre ?? '—'
  const puestoNombre = puestos.data?.find((p) => p.id === data.idPuesto)?.nombre ?? '—'
  const paisNombre = paises.data?.find((p) => p.codigo === data.pais)?.nombre ?? data.pais ?? '—'

  return (
    <div className="space-y-5">
      <DetailHeader
        backLabel="Volver a empleados"
        onBack={() => navigate('/empleados')}
        eyebrow="Ficha de empleado"
        title={nombreDisplay}
        subtitle={
          <>
            {puestoNombre} · {deptoNombre} · {empresaNombre}
            <span
              className="ml-2 font-mono text-xs text-slate-500"
              title="Identificador interno en el sistema de RRHH. No es el código del reloj."
            >
              ID RRHH {data.id}
            </span>
          </>
        }
        actions={
          <>
            {puede('rrhh.empleados', 'editar') && (
              <DetailAction
                icon="solar:pen-bold"
                label="Editar datos"
                onClick={() => navigate(`/empleados/${id}/editar`)}
              />
            )}
            {data.estaActivo ? (
              puede('rrhh.empleados', 'eliminar') && (
              <DetailAction
                icon="solar:user-minus-bold"
                label="Dar de baja"
                variant="danger"
                onClick={() => setBajaOpen(true)}
              />
              )
            ) : (
              puede('rrhh.empleados', 'editar') && (
              <DetailAction
                icon={reactivar.isPending ? 'svg-spinners:180-ring' : 'solar:user-check-bold'}
                label={reactivar.isPending ? 'Reactivando…' : 'Reactivar'}
                variant="primary"
                onClick={onReactivar}
                disabled={reactivar.isPending}
              />
              )
            )}
          </>
        }
        footer={
          <div className="flex flex-wrap items-center gap-2">
            {data.estaActivo ? (
              <DetailChip icon="solar:check-circle-bold" className="border-emerald-500/30 text-emerald-300">
                Activo
              </DetailChip>
            ) : (
              <DetailChip icon="solar:close-circle-bold" className="border-rose-500/30 text-rose-300">
                Dado de baja
              </DetailChip>
            )}
            <DetailChip icon="solar:calendar-bold">Ingresó el {formatDate(data.fechaContratacion)}</DetailChip>
            {verSueldos && data.salarioBaseContrato != null && (
              <DetailChip icon="solar:wallet-money-bold">Salario base {formatQ(data.salarioBaseContrato)}</DetailChip>
            )}
            {data.codigoEmpleadoBio != null ? (
              <button
                type="button"
                onClick={() => copiarCodigoBio(data.codigoEmpleadoBio!)}
                title="Copiar el código del reloj"
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <DetailChip
                  icon="solar:fingerprint-bold"
                  className="border-emerald-400/40 text-emerald-200 hover:bg-white/10"
                >
                  Código BioTime <span className="font-mono font-bold">{data.codigoEmpleadoBio}</span>
                  <Icon icon="solar:copy-linear" width={12} className="opacity-70" />
                </DetailChip>
              </button>
            ) : (
              data.estaActivo && (
                <DetailChip icon="solar:fingerprint-bold" className="border-amber-400/40 text-amber-300">
                  Sin registrar en BioTime
                </DetailChip>
              )
            )}
            {bio.estado === 'CON_HUELLA' && bio.huella && (
              <DetailChip icon="solar:check-circle-bold" className="border-emerald-400/40 text-emerald-200">
                Huella registrada {formatFechaHuella(bio.huella.fechaHuella)}
                {bio.huella.reloj ? ` · ${bio.huella.reloj}` : ''}
              </DetailChip>
            )}
            {bio.estado === 'FALTA_HUELLA' && (
              <DetailChip icon="solar:clock-circle-bold" className="border-sky-400/40 text-sky-200">
                Falta huella en el reloj
              </DetailChip>
            )}
            {bio.estado === 'NO_EN_BIOTIME' && (
              <DetailChip icon="solar:danger-triangle-bold" className="border-rose-400/40 text-rose-300">
                No existe en BioTime
              </DetailChip>
            )}
          </div>
        }
      />

      {data.estaActivo && data.codigoEmpleadoBio == null && puede('rrhh.biometrico', 'editar') && (
        <Alert variant="warning" data-testid="rh-empleado__aviso-biometrico">
          <Icon icon="solar:fingerprint-bold" width={18} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <AlertTitle>Paso 1 pendiente: no está registrado en BioTime</AlertTitle>
              <AlertDescription>
                Este empleado no está en BioTime, por eso no aparece en el reloj: no se le puede registrar la huella
                ni puede marcar asistencia. Regístrelo y luego enrole su huella con el código que se le asigne.
              </AlertDescription>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => setBioOpen(true)}
              data-testid="rh-empleado__btn-registrar-bio"
            >
              <Icon icon="solar:fingerprint-bold" />
              Registrar en biométrico
            </Button>
          </div>
        </Alert>
      )}

      {data.estaActivo && bio.estado === 'FALTA_HUELLA' && (
        <Alert variant="info" data-testid="rh-empleado__aviso-huella">
          <Icon icon="solar:clock-circle-bold" width={18} />
          <AlertTitle>Paso 2 pendiente: falta la huella en el reloj</AlertTitle>
          <AlertDescription>
            Ya está en BioTime con el código <strong className="font-mono">{data.codigoEmpleadoBio}</strong>, pero
            todavía no tiene huella, así que no puede marcar. En el reloj: <strong>M/OK → Usuarios</strong> → buscar el
            código → <strong>Editar → Huella</strong> (índice derecho y luego el izquierdo de respaldo).
          </AlertDescription>
        </Alert>
      )}

      {data.estaActivo && bio.estado === 'NO_EN_BIOTIME' && (
        <Alert variant="destructive" data-testid="rh-empleado__aviso-no-biotime">
          <Icon icon="solar:danger-triangle-bold" width={18} />
          <AlertTitle>
            {bio.huella?.eliminadoEnBiotime ? 'El código fue eliminado en BioTime' : 'El código no existe en BioTime'}
          </AlertTitle>
          <AlertDescription>
            En RRHH tiene el código <strong className="font-mono">{data.codigoEmpleadoBio}</strong>, pero BioTime no lo
            tiene activo, así que no aparece en el reloj y no puede marcar. Repórtelo a TI para revisarlo.
          </AlertDescription>
        </Alert>
      )}

      {!data.estaActivo && (data.tipoBaja || data.fechaBaja || data.motivoBaja) && (
        <Alert variant="destructive">
          <Icon icon="solar:user-minus-bold" width={18} />
          <AlertTitle>Empleado dado de baja</AlertTitle>
          <AlertDescription>
            <strong>{data.tipoBaja ?? '—'}</strong>
            {' · '}
            {formatDate(data.fechaBaja)}
            {data.motivoBaja && (
              <>
                <br />
                {data.motivoBaja}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Identificación personal" icon="solar:user-id-bold">
          <dl className="divide-y divide-slate-100">
            <Item label="DPI" value={data.numeroIdentificacionNacional ?? '—'} mono />
            <Item label="NIT" value={data.idTributario ?? '—'} mono />
            <Item label="IGSS" value={data.idSeguroSocial ?? '—'} mono />
            <Item label="Fecha de nacimiento" value={formatDate(data.fechaNacimiento)} />
            <Item label="Sexo" value={labelDe(SEXOS, data.sexo)} />
            <Item label="Estado civil" value={labelDe(ESTADOS_CIVILES, data.estadoCivil)} />
            <Item label="Hijos" value={data.cantidadHijos != null ? String(data.cantidadHijos) : '—'} />
            <Item label="Apellido de casada" value={data.apellidoCasada || '—'} />
            <Item label="Discapacidad" value={labelDe(TIPOS_DISCAPACIDAD, data.tipoDiscapacidad)} />
            <Item label="Pasaporte" value={data.pasaporte || '—'} />
          </dl>
        </Panel>

        <Panel title="Laboral" icon="solar:case-round-bold">
          <dl className="divide-y divide-slate-100">
            <Item label="Empresa" value={empresaNombre} />
            <Item label="Departamento" value={deptoNombre} />
            <Item label="Sub-departamento" value={subDeptoNombre} />
            <Item label="Puesto" value={puestoNombre} />
            <Item label="Jornada" value={data.jornada ?? '—'} />
            <Item label="Temporalidad" value={data.temporalidadContrato ?? '—'} />
            <Item label="Tipo de contrato" value={data.tipoContrato ?? '—'} />
            <Item label="Fecha de ingreso" value={formatDate(data.fechaContratacion)} />
            {data.fechaReingreso && <Item label="Fecha de reingreso" value={formatDate(data.fechaReingreso)} />}
            {verSueldos && (
              <Item
                label="Salario base"
                value={data.salarioBaseContrato != null ? formatQ(data.salarioBaseContrato) : '—'}
                strong
              />
            )}
            <Item label="Profesión" value={data.profesion || '—'} />
            <Item label="Título / diploma" value={data.titulo || '—'} />
          </dl>
        </Panel>

        <Panel title="Bancario y contacto" icon="solar:card-bold">
          <dl className="divide-y divide-slate-100">
            <Item label="Forma de pago" value={data.formaPago ?? '—'} />
            <Item
              label="Tipo de nómina"
              value={
                data.frecuenciaPago === 'MENSUAL' ? 'Mensual' : data.frecuenciaPago === 'QUINCENAL' ? 'Quincenal' : '—'
              }
            />
            <Item label="Código de banco" value={data.codigoBanco || '—'} />
            <Item label="Número de cuenta" value={data.numeroCuenta || '—'} mono />
            <Item label="Tipo de cuenta" value={data.tipoCuenta ?? '—'} />
            <Item label="Teléfono" value={data.telefono || '—'} />
            <Item label="Correo" value={data.correo || '—'} />
            <Item
              label="Código BioTime"
              value={
                data.codigoEmpleadoBio != null
                  ? String(data.codigoEmpleadoBio)
                  : data.estaActivo
                    ? 'Sin registrar en el biométrico'
                    : '—'
              }
              mono={data.codigoEmpleadoBio != null}
            />
            {data.codigoEmpleadoBio != null && (
              <>
                <Item
                  label="Huellas registradas"
                  value={
                    huellasQ.isLoading
                      ? 'Consultando BioTime…'
                      : huellasQ.isError
                        ? 'No se pudo consultar BioTime'
                        : bio.estado === 'NO_EN_BIOTIME'
                          ? 'No existe en BioTime'
                          : bio.huella && bio.huella.huellas > 0
                            ? `${bio.huella.huellas} dedo${bio.huella.huellas === 1 ? '' : 's'}`
                            : 'Ninguna (falta registrar)'
                  }
                />
                {bio.huella && bio.huella.huellas > 0 && (
                  <>
                    <Item label="Fecha registro de huella" value={formatFechaHuella(bio.huella.fechaHuella)} />
                    <Item label="Reloj donde se registró" value={bio.huella.reloj ?? '—'} />
                  </>
                )}
              </>
            )}
          </dl>
        </Panel>

        <Panel title="Cultural (MINTRAB)" icon="solar:globus-bold">
          <dl className="divide-y divide-slate-100">
            <Item label="País" value={paisNombre} />
            <Item label="Pueblo de pertenencia" value={labelDe(PUEBLOS_GUATEMALA, data.puebloPertenencia)} />
            <Item label="Comunidad lingüística" value={labelDe(COMUNIDADES_LINGUISTICAS, data.comunidadLinguistica)} />
            <Item label="Grupo étnico" value={data.grupoEtnico || '—'} />
            <Item label="Lugar de nacimiento" value={data.lugarNacimientoMunicipio || '—'} />
            <Item label="Permiso extranjero" value={data.permisoExtranjero || '—'} />
          </dl>
        </Panel>
      </div>

      <BajaDialog
        open={bajaOpen}
        onOpenChange={setBajaOpen}
        empleadoId={String(data.id)}
        empleadoNombre={nombreDisplay}
      />
      <RegistrarBiometricoDialog
        empleado={bioOpen ? { id: data.id, nombre: nombreDisplay, puesto: puestoNombre !== '—' ? puestoNombre : null } : null}
        onClose={() => setBioOpen(false)}
      />
    </div>
  )
}

function Item({
  label,
  value,
  mono,
  strong,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  strong?: boolean
}) {
  const vacio = value === '—'
  return (
    <div className="grid grid-cols-5 gap-3 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="col-span-2 text-slate-500">{label}</dt>
      <dd
        className={[
          'col-span-3 break-words',
          vacio ? 'text-slate-300' : strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-800',
          mono && !vacio ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
