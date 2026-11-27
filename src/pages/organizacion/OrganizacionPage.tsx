import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/DataTable'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { FieldLabel, FilterCard, KpiCard, Panel } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import type { DepartamentoNodo, PuestoNodo, SubDepartamentoNodo } from '@/api/estructura'
import { useEmpresas, usePaises } from '@/hooks/useCompanyCatalogos'
import {
  useArbolEmpresa,
  useEliminarDepartamento,
  useEliminarPuesto,
  useEliminarSubDepartamento,
} from '@/hooks/useEstructura'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { NodoDialog, type NodoDialogState } from './NodoDialog'
import { ICONO_DEFAULT, RecursosPuestoDialog } from './RecursosPuestoDialog'

const TID = 'rh-organizacion'

interface TreeApi {
  openDeptos: Set<number>
  openSubs: Set<number>
  toggleDepto: (id: number) => void
  toggleSub: (id: number) => void
  editarDepartamento: (d: DepartamentoNodo) => void
  eliminarDepartamento: (d: DepartamentoNodo) => void
  nuevoSub: (deptoId: number) => void
  editarSub: (s: SubDepartamentoNodo) => void
  eliminarSub: (s: SubDepartamentoNodo) => void
  nuevoPuesto: (subId: number) => void
  editarPuesto: (p: PuestoNodo) => void
  eliminarPuesto: (p: PuestoNodo) => void
  configurarPuesto: (p: PuestoNodo) => void
}

const DIALOG_INICIAL: NodoDialogState = { open: false, nivel: 'departamento', mode: 'crear' }

export default function OrganizacionPage() {
  const { data: paises } = usePaises()
  const [paisId, setPaisId] = useState<number | undefined>()
  const { data: empresas } = useEmpresas(paisId)
  const [empresaId, setEmpresaId] = useState<number | undefined>()

  const [openDeptos, setOpenDeptos] = useState<Set<number>>(new Set())
  const [openSubs, setOpenSubs] = useState<Set<number>>(new Set())
  const [dialog, setDialog] = useState<NodoDialogState>(DIALOG_INICIAL)
  const [puestoConfigId, setPuestoConfigId] = useState<number | null>(null)

  const { data: arbol, isLoading } = useArbolEmpresa(empresaId)
  const delDepto = useEliminarDepartamento()
  const delSub = useEliminarSubDepartamento()
  const delPuesto = useEliminarPuesto()

  // Default país: GT si existe, si no el primero.
  useEffect(() => {
    if (paisId == null && paises?.length) {
      setPaisId(paises.find((p) => p.codigo === 'GT')?.id ?? paises[0].id)
    }
  }, [paises, paisId])

  // Default empresa: la primera del país; re-selecciona si la actual no pertenece.
  useEffect(() => {
    if (!empresas?.length) return
    if (empresaId == null || !empresas.some((e) => e.id === empresaId)) {
      setEmpresaId(empresas[0].id)
    }
  }, [empresas, empresaId])

  // Al cambiar de empresa, colapsamos todo.
  useEffect(() => {
    setOpenDeptos(new Set())
    setOpenSubs(new Set())
  }, [empresaId])

  const totales = useMemo(() => {
    const deptos = arbol ?? []
    let subs = 0
    let puestos = 0
    for (const d of deptos) {
      subs += d.subdepartamentos.length
      for (const s of d.subdepartamentos) puestos += s.puestos.length
    }
    return { deptos: deptos.length, subs, puestos }
  }, [arbol])

  // El puesto del minimodal se busca en el árbol vivo (así refleja lo guardado tras refrescar).
  const puestoConfig = useMemo(() => {
    if (puestoConfigId == null) return null
    for (const d of arbol ?? [])
      for (const s of d.subdepartamentos)
        for (const p of s.puestos) if (p.id === puestoConfigId) return p
    return null
  }, [arbol, puestoConfigId])

  const empresaNombre = empresas?.find((e) => e.id === empresaId)?.nombre

  function toggle(set: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) {
    set((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirmarEliminar(label: string, fn: () => Promise<unknown>) {
    const ok = await confirmar({
      titulo: `¿Eliminar ${label}?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await fn()
      notify('success', 'Eliminado')
    } catch (err) {
      notify('error', 'No se pudo eliminar', extractApiErrorMessage(err))
    }
  }

  const api: TreeApi = {
    openDeptos,
    openSubs,
    toggleDepto: (id) => toggle(setOpenDeptos, id),
    toggleSub: (id) => toggle(setOpenSubs, id),
    editarDepartamento: (d) =>
      setDialog({ open: true, nivel: 'departamento', mode: 'editar', nodo: { id: d.id, nombre: d.nombre, codigo: d.codigo } }),
    eliminarDepartamento: (d) =>
      confirmarEliminar(`el departamento "${d.nombre}"`, () => delDepto.mutateAsync(d.id)),
    nuevoSub: (deptoId) => {
      // Al agregar un hijo, dejamos la rama abierta para que se vea al crearse.
      setOpenDeptos((prev) => new Set(prev).add(deptoId))
      setDialog({ open: true, nivel: 'subdepartamento', mode: 'crear', parentId: deptoId })
    },
    editarSub: (s) =>
      setDialog({ open: true, nivel: 'subdepartamento', mode: 'editar', nodo: { id: s.id, nombre: s.nombre } }),
    eliminarSub: (s) =>
      confirmarEliminar(`el sub-departamento "${s.nombre}"`, () => delSub.mutateAsync(s.id)),
    nuevoPuesto: (subId) => {
      setOpenSubs((prev) => new Set(prev).add(subId))
      setDialog({ open: true, nivel: 'puesto', mode: 'crear', parentId: subId })
    },
    editarPuesto: (p) =>
      setDialog({ open: true, nivel: 'puesto', mode: 'editar', nodo: { id: p.id, nombre: p.nombre, codigoBiotime: p.codigoBiotime } }),
    eliminarPuesto: (p) => confirmarEliminar(`el puesto "${p.nombre}"`, () => delPuesto.mutateAsync(p.id)),
    configurarPuesto: (p) => setPuestoConfigId(p.id),
  }

  const nuevoDepto = () => setDialog({ open: true, nivel: 'departamento', mode: 'crear', parentId: empresaId })

  const expandirTodo = () => {
    setOpenDeptos(new Set((arbol ?? []).map((d) => d.id)))
    setOpenSubs(new Set((arbol ?? []).flatMap((d) => d.subdepartamentos.map((s) => s.id))))
  }
  const contraerTodo = () => {
    setOpenDeptos(new Set())
    setOpenSubs(new Set())
  }

  return (
    <div className="space-y-5">
      {/* Encabezado + filtros */}
      <FilterCard>
        <PageHeader
          titulo="Organización"
          icono="solar:structure-bold"
          descripcion="Organigrama de departamentos, sub-departamentos y puestos de cada empresa. Solo se pueden eliminar las ramas que no tienen nada adentro."
        >
          <Button disabled={!empresaId} onClick={nuevoDepto} data-testid={`${TID}__btn-nuevo-depto`}>
            <Icon icon="solar:add-circle-bold" width={16} />
            Nuevo departamento
          </Button>
        </PageHeader>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-dashed border-slate-200 pt-4">
          <div>
            <FieldLabel>País</FieldLabel>
            <Select
              value={paisId != null ? String(paisId) : undefined}
              onValueChange={(v) => {
                setPaisId(Number(v))
                setEmpresaId(undefined)
              }}
            >
              <SelectTrigger className="w-44" data-testid={`${TID}__filtro-pais`}>
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                {(paises ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Empresa</FieldLabel>
            <Select
              value={empresaId != null ? String(empresaId) : undefined}
              onValueChange={(v) => setEmpresaId(Number(v))}
              disabled={!empresas?.length}
            >
              <SelectTrigger className="w-64" data-testid={`${TID}__filtro-empresa`}>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {(empresas ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterCard>

      {/* Totales */}
      {empresaId && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Departamentos" value={totales.deptos} accent="sky" icon="solar:buildings-2-bold" loading={isLoading} />
          <KpiCard label="Sub-departamentos" value={totales.subs} accent="cyan" icon="solar:folder-with-files-bold" loading={isLoading} />
          <KpiCard label="Puestos" value={totales.puestos} accent="violet" icon="solar:case-round-bold" loading={isLoading} />
        </section>
      )}

      {/* Organigrama */}
      <Panel
        title={empresaNombre ? `Organigrama de ${empresaNombre}` : 'Organigrama'}
        subtitle="Haz clic en un departamento o sub-departamento para desplegar lo que tiene debajo. El engrane de cada puesto configura sus equipos y accesos."
        right={
          empresaId && arbol?.length ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={expandirTodo} data-testid={`${TID}__btn-expandir`}>
                <Icon icon="solar:maximize-square-minimalistic-linear" width={15} />
                Expandir todo
              </Button>
              <Button size="sm" variant="outline" onClick={contraerTodo} data-testid={`${TID}__btn-contraer`}>
                <Icon icon="solar:minimize-square-minimalistic-linear" width={15} />
                Contraer
              </Button>
            </div>
          ) : undefined
        }
      >
        {!empresaId ? (
          <EmptyState
            icon="solar:buildings-2-bold"
            title="Elige una empresa"
            description="Selecciona un país y una empresa arriba para ver su estructura."
          />
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-6 py-6">
            <Skeleton className="h-16 w-60 rounded-2xl" />
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-48 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <OrgCanvas>
            <div className="org-root">
              <EmpresaCard nombre={empresaNombre ?? 'Empresa'} totales={totales} onNuevoDepto={nuevoDepto} />
              {arbol?.length ? (
                <ul>
                  {arbol.map((d, i) => (
                    <DepartamentoNode key={d.id} depto={d} api={api} index={i} />
                  ))}
                </ul>
              ) : (
                <div className="org-leaves">
                  <AddCard label="Crear el primer departamento" onClick={nuevoDepto} />
                </div>
              )}
            </div>
          </OrgCanvas>
        )}
      </Panel>

      <NodoDialog state={dialog} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} />
      <RecursosPuestoDialog puesto={puestoConfig} onOpenChange={(open) => !open && setPuestoConfigId(null)} />
    </div>
  )
}

// ───────────────────────── Lienzo (scroll + arrastre + zoom) ─────────────────────────

const ZOOMS = [0.6, 0.75, 0.9, 1, 1.1] as const

function OrgCanvas({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [zoomIdx, setZoomIdx] = useState(3)
  const [arrastrando, setArrastrando] = useState(false)

  // Arrastrar el fondo para moverse (los clics en tarjetas/botones no inician arrastre).
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, input')) return
    const el = ref.current
    if (!el) return
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    setArrastrando(true)
    el.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = ref.current
    if (!el || !drag.current) return
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
    el.scrollTop = drag.current.top - (e.clientY - drag.current.y)
  }
  function onPointerUp() {
    drag.current = null
    setArrastrando(false)
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/90 p-0.5 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          disabled={zoomIdx === 0}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Alejar"
          title="Alejar"
        >
          <Icon icon="solar:minus-circle-linear" width={16} />
        </button>
        <span className="w-10 text-center text-[11px] font-medium tabular-nums text-slate-500">
          {Math.round(ZOOMS[zoomIdx] * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}
          disabled={zoomIdx === ZOOMS.length - 1}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Acercar"
          title="Acercar"
        >
          <Icon icon="solar:add-circle-linear" width={16} />
        </button>
      </div>
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'max-h-[75vh] min-h-[22rem] overflow-auto rounded-xl border border-slate-100 bg-slate-50/60 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:18px_18px]',
          arrastrando ? 'cursor-grabbing select-none' : 'cursor-grab',
        )}
        data-testid={`${TID}__organigrama`}
      >
        <div className="org-tree mx-auto w-max min-w-full px-6 pb-10 pt-6" style={{ zoom: ZOOMS[zoomIdx] }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Nodos ─────────────────────────

function EmpresaCard({
  nombre,
  totales,
  onNuevoDepto,
}: {
  nombre: string
  totales: { deptos: number; subs: number; puestos: number }
  onNuevoDepto: () => void
}) {
  return (
    <div className="flex w-64 flex-col items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-center text-white shadow-lg shadow-slate-900/20">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
        <Icon icon="solar:buildings-bold" width={20} />
      </span>
      <div className="w-full truncate text-sm font-semibold" title={nombre}>{nombre}</div>
      <div className="text-[11px] text-slate-300 tabular-nums">
        {totales.deptos} deptos · {totales.subs} sub-deptos · {totales.puestos} puestos
      </div>
      <button
        type="button"
        onClick={onNuevoDepto}
        className="mt-0.5 flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/20"
      >
        <Icon icon="solar:add-circle-linear" width={14} />
        Departamento
      </button>
    </div>
  )
}

function DepartamentoNode({ depto, api, index }: { depto: DepartamentoNodo; api: TreeApi; index: number }) {
  const open = api.openDeptos.has(depto.id)
  return (
    <li
      className="animate-in fade-in slide-in-from-top-2"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms`, animationFillMode: 'both' }}
    >
      <NodeCard
        tone="sky"
        icon="solar:buildings-2-bold"
        nombre={depto.nombre}
        badge={depto.codigo}
        contador={`${depto.subdepartamentos.length} ${depto.subdepartamentos.length === 1 ? 'sub-depto' : 'sub-deptos'}`}
        open={open}
        onToggle={() => api.toggleDepto(depto.id)}
        onAdd={() => api.nuevoSub(depto.id)}
        addLabel="sub-departamento"
        onEdit={() => api.editarDepartamento(depto)}
        onDelete={() => api.eliminarDepartamento(depto)}
        tipo="departamento"
      />
      {open && (
        <ul className="animate-in fade-in slide-in-from-top-2 duration-200">
          {depto.subdepartamentos.map((s) => (
            <SubNode key={s.id} sub={s} api={api} />
          ))}
          {!depto.subdepartamentos.length && (
            <li>
              <AddCard label="Agregar sub-departamento" onClick={() => api.nuevoSub(depto.id)} />
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

function SubNode({ sub, api }: { sub: SubDepartamentoNodo; api: TreeApi }) {
  const open = api.openSubs.has(sub.id)
  return (
    <li>
      <NodeCard
        tone="cyan"
        icon="solar:folder-with-files-bold"
        nombre={sub.nombre}
        contador={`${sub.puestos.length} ${sub.puestos.length === 1 ? 'puesto' : 'puestos'}`}
        open={open}
        onToggle={() => api.toggleSub(sub.id)}
        onAdd={() => api.nuevoPuesto(sub.id)}
        addLabel="puesto"
        onEdit={() => api.editarSub(sub)}
        onDelete={() => api.eliminarSub(sub)}
        tipo="sub-departamento"
      />
      {open && (
        // Los puestos (hojas) van apilados en columna para que el organigrama no se haga infinito a lo ancho.
        <div className="org-leaves animate-in fade-in slide-in-from-top-2 duration-200">
          {sub.puestos.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center">
              {i > 0 && <span className="org-leaf-link" />}
              <PuestoCard puesto={p} api={api} />
            </div>
          ))}
          {sub.puestos.length > 0 && <span className="org-leaf-link" />}
          <AddCard label="Agregar puesto" onClick={() => api.nuevoPuesto(sub.id)} compact />
        </div>
      )}
    </li>
  )
}

const TONES = {
  sky: { bar: 'bg-sky-500', icon: 'bg-sky-50 text-sky-600 ring-sky-100', open: 'ring-sky-300' },
  cyan: { bar: 'bg-cyan-500', icon: 'bg-cyan-50 text-cyan-600 ring-cyan-100', open: 'ring-cyan-300' },
} as const

function NodeCard({
  tone,
  icon,
  nombre,
  badge,
  contador,
  open,
  onToggle,
  onAdd,
  addLabel,
  onEdit,
  onDelete,
  tipo,
}: {
  tone: keyof typeof TONES
  icon: string
  nombre: string
  badge?: string | null
  contador: string
  open: boolean
  onToggle: () => void
  onAdd: () => void
  addLabel: string
  onEdit: () => void
  onDelete: () => void
  tipo: string
}) {
  const t = TONES[tone]
  return (
    <div
      className={cn(
        'group relative w-52 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md',
        open ? cn('ring-2', t.open) : 'ring-slate-200',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', t.bar)} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-col items-center gap-1.5 px-3 pb-2.5 pt-4 text-center"
        title={open ? 'Ocultar lo que tiene debajo' : 'Ver lo que tiene debajo'}
      >
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl ring-1', t.icon)}>
          <Icon icon={icon} width={17} />
        </span>
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{nombre}</span>
        {badge && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
            {badge}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 tabular-nums">
          {contador}
          <Icon
            icon="solar:alt-arrow-down-bold"
            width={11}
            className={cn('transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>
      <div className="absolute right-1.5 top-2 flex flex-col gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <MiniAction icon="solar:add-circle-bold" label={`Agregar ${addLabel}`} onClick={onAdd} hover="hover:bg-sky-50 hover:text-sky-600" />
        <MiniAction icon="solar:pen-bold" label={`Editar ${tipo}`} onClick={onEdit} hover="hover:bg-sky-50 hover:text-sky-600" />
        <MiniAction icon="solar:trash-bin-trash-bold" label={`Eliminar ${tipo}`} onClick={onDelete} hover="hover:bg-rose-50 hover:text-rose-600" />
      </div>
    </div>
  )
}

const MAX_ICONOS = 6

function PuestoCard({ puesto, api }: { puesto: PuestoNodo; api: TreeApi }) {
  const recursos = puesto.recursos ?? []
  const visibles = recursos.slice(0, MAX_ICONOS)
  const resto = recursos.length - visibles.length
  return (
    <div className="group relative w-52 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-500">
          <Icon icon="solar:case-round-bold" width={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[13px] font-medium leading-tight text-slate-800" title={puesto.nombre}>
            {puesto.nombre}
          </div>
          {puesto.codigoBiotime != null && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400" title="Código del puesto en el reloj biométrico">
              reloj {puesto.codigoBiotime}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => api.configurarPuesto(puesto)}
          title="Equipos y accesos del puesto"
          aria-label={`Configurar equipos y accesos de ${puesto.nombre}`}
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors',
            recursos.length
              ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
          )}
          data-testid={`${TID}__btn-config-puesto-${puesto.id}`}
        >
          <Icon icon="solar:settings-bold" width={15} />
        </button>
      </div>

      {recursos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-dashed border-slate-100 pt-2">
          {visibles.map((r) => (
            <span
              key={r.id}
              title={`${r.nombre}${r.cantidad > 1 ? ` ×${r.cantidad}` : ''}`}
              className={cn(
                'relative grid h-6 w-6 place-items-center rounded-md',
                r.tipo === 'EQUIPO' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600',
              )}
            >
              <Icon icon={r.icono || ICONO_DEFAULT[r.tipo]} width={13} />
              {r.cantidad > 1 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-slate-700 px-1 text-[8px] font-bold leading-[12px] text-white">
                  {r.cantidad}
                </span>
              )}
            </span>
          ))}
          {resto > 0 && <span className="text-[10px] font-semibold text-slate-400">+{resto}</span>}
        </div>
      )}

      <div className="absolute -right-2 -top-2 flex gap-0.5 rounded-lg bg-white p-0.5 opacity-0 shadow ring-1 ring-slate-200 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <MiniAction icon="solar:pen-bold" label="Editar puesto" onClick={() => api.editarPuesto(puesto)} hover="hover:bg-sky-50 hover:text-sky-600" />
        <MiniAction icon="solar:trash-bin-trash-bold" label="Eliminar puesto" onClick={() => api.eliminarPuesto(puesto)} hover="hover:bg-rose-50 hover:text-rose-600" />
      </div>
    </div>
  )
}

// ───────────────────────── Piezas reutilizables ─────────────────────────

function MiniAction({ icon, label, onClick, hover }: { icon: string; label: string; onClick: () => void; hover: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn('grid h-6 w-6 place-items-center rounded-md text-slate-400 transition-colors', hover)}
    >
      <Icon icon={icon} width={13} />
    </button>
  )
}

function AddCard({ label, onClick, compact }: { label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-52 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 text-xs font-semibold text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-50',
        compact ? 'py-2' : 'py-4',
      )}
    >
      <Icon icon="solar:add-circle-linear" width={15} />
      {label}
    </button>
  )
}
