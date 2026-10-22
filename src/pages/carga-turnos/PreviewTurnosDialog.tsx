import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TableSearch } from '@/components/shared/TableToolbar'
import { EmptyState } from '@/components/shared/DataTable'
import { cn } from '@/lib/utils'
import type { PreviewTurnos, PreviewFilaTurno } from '@/types'

type Estado = 'ok' | 'aviso' | 'error'
type FiltroEstado = 'TODOS' | Estado
type FiltroTipo = 'TODOS' | 'DIA' | 'NOCHE' | 'DESCANSO' | 'ASUETO'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function estadoDe(f: PreviewFilaTurno): Estado {
  if (f.errores.length) return 'error'
  if (f.avisos.length) return 'aviso'
  return 'ok'
}
function diaDe(fecha: string): string {
  return DIAS[new Date(fecha + 'T00:00:00Z').getUTCDay()] ?? ''
}
function fmtHora(h: string | null): string {
  return h ? h.slice(0, 5) : '—'
}
function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
function fmtMeta(min: number | null): string {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ── Nombre "APELLIDOS — Nombres" ──────────────────────────────────────────────
function Nombre({ nombre }: { nombre: string }) {
  const i = nombre.indexOf(' - ')
  if (i === -1) return <span className="font-semibold text-slate-900">{nombre}</span>
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold tracking-tight text-slate-900">{nombre.slice(0, i)}</span>
      <span className="text-slate-500"> — {nombre.slice(i + 3)}</span>
    </span>
  )
}

// ── Badge de tipo de turno ────────────────────────────────────────────────────
const TIPO_META: Record<string, { label: string; cls: string; icon: string }> = {
  DIA: { label: 'Día', cls: 'bg-amber-100 text-amber-700', icon: 'solar:sun-bold' },
  NOCHE: { label: 'Noche', cls: 'bg-indigo-100 text-indigo-700', icon: 'solar:moon-bold' },
  DESCANSO: { label: 'Descanso', cls: 'bg-slate-100 text-slate-600', icon: 'solar:cup-hot-bold' },
  ASUETO: { label: 'Asueto', cls: 'bg-violet-100 text-violet-700', icon: 'solar:confetti-minimalistic-bold' },
}
function TipoBadge({ tipo }: { tipo: string }) {
  const m = TIPO_META[tipo] ?? { label: tipo, cls: 'bg-slate-100 text-slate-500', icon: 'solar:clock-circle-bold' }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', m.cls)}>
      <Icon icon={m.icon} width={12} />
      {m.label}
    </span>
  )
}

// ── Chip de estado (también filtra) ──────────────────────────────────────────
function StatChip({
  icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: string
  label: string
  value: number
  tone: 'neutral' | 'ok' | 'aviso' | 'error'
  active: boolean
  onClick: () => void
}) {
  const tones = {
    neutral: { bar: 'from-slate-500 to-slate-600', icon: 'bg-slate-100 text-slate-600', on: 'ring-2 ring-slate-400' },
    ok: { bar: 'from-emerald-500 to-emerald-600', icon: 'bg-emerald-50 text-emerald-600', on: 'ring-2 ring-emerald-400' },
    aviso: { bar: 'from-amber-500 to-amber-600', icon: 'bg-amber-50 text-amber-600', on: 'ring-2 ring-amber-400' },
    error: { bar: 'from-rose-500 to-rose-600', icon: 'bg-rose-50 text-rose-600', on: 'ring-2 ring-rose-400' },
  }[tone]
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Filtrar por ${label}`}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md',
        active && tones.on,
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', tones.bar)} />
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', tones.icon)}>
        <Icon icon={icon} width={16} />
      </span>
      <div className="leading-none">
        <div className="text-lg font-semibold tabular-nums text-slate-900">{value}</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      </div>
    </button>
  )
}

// ── Filtro segmentado de tipo ─────────────────────────────────────────────────
function TipoFilter({
  value,
  onChange,
  counts,
}: {
  value: FiltroTipo
  onChange: (v: FiltroTipo) => void
  counts: Record<FiltroTipo, number>
}) {
  const opts: { key: FiltroTipo; label: string; dot?: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'DIA', label: 'Día', dot: 'bg-amber-400' },
    { key: 'NOCHE', label: 'Noche', dot: 'bg-indigo-400' },
    { key: 'DESCANSO', label: 'Descanso', dot: 'bg-slate-400' },
    { key: 'ASUETO', label: 'Asueto', dot: 'bg-violet-400' },
  ]
  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de turno"
      className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm"
    >
      {opts.map((o) => {
        const on = value === o.key
        if (o.key !== 'TODOS' && counts[o.key] === 0) return null
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 transition-colors',
              on ? 'bg-cyan-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            {o.dot && <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-white' : o.dot)} />}
            {o.label}
            <span className={cn('tabular-nums text-xs', on ? 'opacity-90' : 'text-slate-400')}>{counts[o.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

export interface PreviewTurnosDialogProps {
  open: boolean
  preview: PreviewTurnos | null
  area: 1 | 2 | 3
  desde: string
  hasta: string
  aplicando: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function PreviewTurnosDialog({
  open,
  preview,
  area,
  desde,
  hasta,
  aplicando,
  onCancel,
  onConfirm,
}: PreviewTurnosDialogProps) {
  const [texto, setTexto] = useState('')
  const [fEstado, setFEstado] = useState<FiltroEstado>('TODOS')
  const [fTipo, setFTipo] = useState<FiltroTipo>('TODOS')
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const [theadH, setTheadH] = useState(37) // alto real del thead sticky (medido) → offset del header de grupo

  const acabados = area === 1
  const maquinas = area === 2
  const filas = preview?.filas ?? []

  const conteos = useMemo(() => {
    const est = { ok: 0, aviso: 0, error: 0 }
    const tip: Record<FiltroTipo, number> = { TODOS: filas.length, DIA: 0, NOCHE: 0, DESCANSO: 0, ASUETO: 0 }
    for (const f of filas) {
      est[estadoDe(f)]++
      if (f.tipo in tip) tip[f.tipo as FiltroTipo]++
    }
    return { est, tip }
  }, [filas])

  const grupos = useMemo(() => {
    const q = norm(texto.trim())
    const visibles = filas.filter(
      (f) =>
        (fEstado === 'TODOS' || estadoDe(f) === fEstado) &&
        (fTipo === 'TODOS' || f.tipo === fTipo) &&
        (!q || norm(f.nombre).includes(q)),
    )
    const map = new Map<number, { idEmpleado: number; nombre: string; equipo: number | null; filas: PreviewFilaTurno[] }>()
    for (const f of visibles) {
      const g = map.get(f.idEmpleado) ?? { idEmpleado: f.idEmpleado, nombre: f.nombre, equipo: null, filas: [] }
      if (g.equipo == null && f.equipo != null) g.equipo = f.equipo
      g.filas.push(f)
      map.set(f.idEmpleado, g)
    }
    return [...map.values()]
      .map((g) => ({ ...g, filas: g.filas.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [filas, texto, fEstado, fTipo])

  // Mide el alto real del thead sticky para anclar los headers de grupo justo debajo (sin valor mágico).
  useLayoutEffect(() => {
    const el = theadRef.current
    if (!el) return
    const measure = () => setTheadH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [grupos.length, acabados, maquinas, open])

  const visiblesCount = grupos.reduce((n, g) => n + g.filas.length, 0)
  // Fecha, Tipo, Horario, [Meta acabados | Turno+Máquina máquinas | — general], Sistema, Estado
  const cols = acabados ? 6 : maquinas ? 7 : 5
  const trabajados = conteos.tip.DIA + conteos.tip.NOCHE
  const bloqueado = (preview?.totalErrores ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {/* Encabezado */}
        <DialogHeader className="space-y-0 border-b border-slate-100 px-6 pb-4 pt-6 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Icon icon="solar:clipboard-check-bold" width={18} />
            </span>
            <DialogTitle className="text-lg">Revisar carga de turnos</DialogTitle>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                acabados ? 'bg-violet-100 text-violet-700' : maquinas ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700',
              )}
            >
              <Icon
                icon={acabados ? 'solar:target-bold' : maquinas ? 'solar:settings-bold' : 'solar:clock-circle-bold'}
                width={13}
              />
              {acabados ? 'Acabados' : maquinas ? 'Máquinas' : 'General'}
            </span>
          </div>
          <DialogDescription className="mt-1">
            Período <b className="text-slate-800 tabular-nums">{desde}</b> – <b className="text-slate-800 tabular-nums">{hasta}</b> ·{' '}
            {filas.length} filas · revisa antes de aplicar. Haz clic en un contador para filtrar.
          </DialogDescription>

          {/* Chips de estado (filtran) */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip
              icon="solar:list-check-bold"
              label="Total"
              value={filas.length}
              tone="neutral"
              active={fEstado === 'TODOS'}
              onClick={() => setFEstado('TODOS')}
            />
            <StatChip
              icon="solar:check-circle-bold"
              label="OK"
              value={conteos.est.ok}
              tone="ok"
              active={fEstado === 'ok'}
              onClick={() => setFEstado(fEstado === 'ok' ? 'TODOS' : 'ok')}
            />
            <StatChip
              icon="solar:danger-triangle-bold"
              label="Avisos"
              value={conteos.est.aviso}
              tone="aviso"
              active={fEstado === 'aviso'}
              onClick={() => setFEstado(fEstado === 'aviso' ? 'TODOS' : 'aviso')}
            />
            <StatChip
              icon="solar:close-circle-bold"
              label="Errores"
              value={conteos.est.error}
              tone="error"
              active={fEstado === 'error'}
              onClick={() => setFEstado(fEstado === 'error' ? 'TODOS' : 'error')}
            />
          </div>
        </DialogHeader>

        {/* Toolbar: búsqueda + filtro de tipo */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <TableSearch
            value={texto}
            onChange={setTexto}
            placeholder="Buscar empleado…"
            className="w-64"
            testId="rh-carga-turnos__preview-busqueda"
          />
          <TipoFilter value={fTipo} onChange={setFTipo} counts={conteos.tip} />
          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            {visiblesCount} de {filas.length} · {grupos.length} empleado{grupos.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-auto">
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center">
              <EmptyState icon="solar:magnifer-bold" title="Sin filas para estos filtros." className="pb-3" />
              <button
                type="button"
                onClick={() => {
                  setTexto('')
                  setFEstado('TODOS')
                  setFTipo('TODOS')
                }}
                className="mb-16 text-xs font-medium text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead ref={theadRef} className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 backdrop-blur [&>th]:border-b [&>th]:border-slate-100 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-slate-500">
                  <th className="w-32">Fecha</th>
                  <th className="w-28">Tipo</th>
                  <th className="w-28">Horario</th>
                  {acabados && <th className="w-24">Meta</th>}
                  {maquinas && <th className="w-16">Turno</th>}
                  {maquinas && <th className="w-24">Máquina</th>}
                  <th className="w-20">Sistema</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => {
                  const dias = g.filas.filter((f) => f.tipo === 'DIA' || f.tipo === 'NOCHE').length
                  const metaTotal = g.filas.reduce((n, f) => n + (f.metaDia ?? 0), 0)
                  const gErr = g.filas.some((f) => f.errores.length)
                  const gAvi = g.filas.some((f) => f.avisos.length)
                  return (
                    <FragmentGroup
                      key={g.idEmpleado}
                      nombre={g.nombre}
                      equipo={g.equipo}
                      acabados={acabados}
                      maquinas={maquinas}
                      dias={dias}
                      metaTotal={metaTotal}
                      gErr={gErr}
                      gAvi={gAvi}
                      cols={cols}
                      stickyTop={theadH}
                      filas={g.filas}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            {bloqueado ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                <Icon icon="solar:danger-triangle-bold" width={14} />
                Corrige los {preview?.totalErrores} errores en el Excel y vuelve a subirlo.
              </span>
            ) : (
              <>
                <b className="text-slate-800 tabular-nums">{trabajados}</b> días de trabajo se aplicarán
                {conteos.est.aviso > 0 && <> · {conteos.est.aviso} con aviso</>}.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={aplicando} data-testid="rh-carga-turnos__btn-cancelar">
              <Icon icon="solar:close-circle-linear" width={16} /> Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={bloqueado || aplicando}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              data-testid="rh-carga-turnos__btn-aplicar"
            >
              <Icon icon={aplicando ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
              {aplicando ? 'Aplicando…' : 'Confirmar y aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Grupo (encabezado de empleado + sus días) ─────────────────────────────────
function FragmentGroup({
  nombre,
  equipo,
  acabados,
  maquinas,
  dias,
  metaTotal,
  gErr,
  gAvi,
  cols,
  stickyTop,
  filas,
}: {
  nombre: string
  equipo: number | null
  acabados: boolean
  maquinas: boolean
  dias: number
  metaTotal: number
  gErr: boolean
  gAvi: boolean
  cols: number
  stickyTop: number
  filas: PreviewFilaTurno[]
}) {
  return (
    <>
      <tr className="sticky z-[5]" style={{ top: stickyTop }}>
        <td colSpan={cols} className="border-y border-slate-200 bg-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <Icon icon="solar:user-bold" width={14} className="text-slate-400" />
            <Nombre nombre={nombre} />
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {dias} día{dias === 1 ? '' : 's'}
            </span>
            {maquinas &&
              (equipo != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                  <Icon icon="solar:settings-bold" width={11} /> Equipo {equipo}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">sin cuadrilla</span>
              ))}
            {acabados && metaTotal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                <Icon icon="solar:target-bold" width={11} /> {fmtMeta(metaTotal)}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              {gErr && <span className="h-2 w-2 rounded-full bg-rose-500" title="Tiene errores" />}
              {gAvi && <span className="h-2 w-2 rounded-full bg-amber-400" title="Tiene avisos" />}
            </span>
          </div>
        </td>
      </tr>
      {filas.map((f) => {
        const est = estadoDe(f)
        return (
          <tr
            key={`${f.idEmpleado}-${f.fecha}`}
            className={cn(
              'transition-colors [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-4 [&>td]:py-2 [&>td]:align-middle',
              est === 'error' ? 'bg-rose-50/70' : est === 'aviso' ? 'bg-amber-50/60' : 'hover:bg-slate-50/80',
            )}
          >
            <td className="whitespace-nowrap text-xs tabular-nums text-slate-700">
              <span className="text-slate-400">{diaDe(f.fecha)}</span> {f.fecha.slice(5)}
            </td>
            <td>
              <TipoBadge tipo={f.tipo} />
            </td>
            <td className="whitespace-nowrap text-xs tabular-nums text-slate-600">
              {f.horaInicio ? `${fmtHora(f.horaInicio)}–${fmtHora(f.horaFin)}` : '—'}
            </td>
            {acabados && <td className="text-xs tabular-nums text-slate-700">{f.metaDia != null ? fmtMeta(f.metaDia) : '—'}</td>}
            {maquinas && <td className="text-xs tabular-nums text-slate-700">{f.numTurno ?? '—'}</td>}
            {maquinas && (
              <td className="text-xs">
                {f.maquina != null ? (
                  <span className="inline-flex items-center gap-1 tabular-nums text-slate-700">
                    <Icon icon="solar:settings-bold" width={12} className="text-slate-400" /> {f.maquina}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            )}
            <td className="text-xs tabular-nums text-slate-500">{f.sistema ?? '—'}</td>
            <td className="text-xs">
              {est === 'error' ? (
                <span className="inline-flex items-center gap-1 font-medium text-rose-700">
                  <Icon icon="solar:close-circle-bold" width={14} className="shrink-0" />
                  {f.errores[0]}
                </span>
              ) : est === 'aviso' ? (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                  <Icon icon="solar:danger-triangle-bold" width={14} className="shrink-0" />
                  {f.avisos[0]}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <Icon icon="solar:check-circle-bold" width={14} /> OK
                </span>
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}
