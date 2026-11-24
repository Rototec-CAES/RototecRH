import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { formatFechaHuella, type InfoBiometrico } from '@/lib/biometrico'

const TONO = {
  verde: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  azul: 'border-sky-200 bg-sky-50 text-sky-800',
  ambar: 'border-amber-300 bg-amber-50 text-amber-800',
  rojo: 'border-rose-300 bg-rose-50 text-rose-800',
  gris: 'border-slate-200 bg-slate-50 text-slate-600',
}

function Chip({ tono, icon, children, title }: { tono: keyof typeof TONO; icon: string; children: React.ReactNode; title: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold', TONO[tono])}
    >
      <Icon icon={icon} width={12} className="shrink-0" />
      {children}
    </span>
  )
}

/**
 * Estado del empleado en el reloj biométrico (BioTime), para la tabla.
 * Línea 1: código BioTime (el que se busca en el reloj) o el aviso si no tiene.
 * Línea 2: si tiene huella y desde cuándo, o qué falta.
 */
export function BiometricoBadge({ info, className }: { info: InfoBiometrico; className?: string }) {
  const { estado, codigo, huella } = info
  if (estado === 'NO_APLICA') return null

  if (estado === 'SIN_BIOMETRICO')
    return (
      <div className={className}>
        <Chip
          tono="ambar"
          icon="solar:fingerprint-bold"
          title="Paso 1 pendiente: no existe en BioTime ni tiene código, así que no aparece en el reloj. Lo registra RRHH desde este sistema."
        >
          Sin registrar en BioTime
        </Chip>
      </div>
    )

  const codigoChip = (tono: keyof typeof TONO, title: string) => (
    <Chip tono={tono} icon="solar:fingerprint-linear" title={title}>
      <span className="font-mono">{codigo}</span>
    </Chip>
  )

  return (
    <div className={cn('space-y-0.5', className)}>
      {estado === 'CON_HUELLA' &&
        codigoChip('verde', 'Código BioTime: es el número que se busca en el reloj y con el que marca')}
      {estado === 'FALTA_HUELLA' &&
        codigoChip('azul', 'Paso 2 pendiente: ya está en BioTime con este código; falta registrar la huella en el reloj')}
      {estado === 'NO_EN_BIOTIME' &&
        codigoChip(
          'rojo',
          huella?.eliminadoEnBiotime
            ? 'Este código fue eliminado en BioTime: el empleado no aparece en el reloj'
            : 'Este código no existe en BioTime: el empleado no aparece en el reloj',
        )}
      {estado === 'SIN_DATO' && codigoChip('gris', 'Código BioTime')}

      {estado === 'CON_HUELLA' && huella && (
        <div
          className="flex items-center gap-1 text-[11px] text-slate-500"
          title={`${huella.huellas} huella${huella.huellas === 1 ? '' : 's'} registrada${huella.huellas === 1 ? '' : 's'}${huella.reloj ? ` en ${huella.reloj}` : ''}`}
        >
          <Icon icon="solar:check-circle-bold" width={11} className="text-emerald-600" />
          <span className="tabular-nums">{formatFechaHuella(huella.fechaHuella)}</span>
          {huella.huellas === 1 && <span className="text-amber-600">· 1 dedo</span>}
        </div>
      )}
      {estado === 'FALTA_HUELLA' && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-sky-700">
          <Icon icon="solar:clock-circle-linear" width={11} />
          Falta huella en el reloj
        </div>
      )}
      {estado === 'NO_EN_BIOTIME' && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-rose-700">
          <Icon icon="solar:danger-triangle-linear" width={11} />
          {huella?.eliminadoEnBiotime ? 'Eliminado en BioTime' : 'Código no existe en BioTime'}
        </div>
      )}
    </div>
  )
}
