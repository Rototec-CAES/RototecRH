import { useEffect, useMemo, useState } from 'react'
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
    nuevoSub: (deptoId) => setDialog({ open: true, nivel: 'subdepartamento', mode: 'crear', parentId: deptoId }),
    editarSub: (s) =>
      setDialog({ open: true, nivel: 'subdepartamento', mode: 'editar', nodo: { id: s.id, nombre: s.nombre } }),
    eliminarSub: (s) =>
      confirmarEliminar(`el sub-departamento "${s.nombre}"`, () => delSub.mutateAsync(s.id)),
    nuevoPuesto: (subId) => setDialog({ open: true, nivel: 'puesto', mode: 'crear', parentId: subId }),
    editarPuesto: (p) =>
      setDialog({ open: true, nivel: 'puesto', mode: 'editar', nodo: { id: p.id, nombre: p.nombre, codigoBiotime: p.codigoBiotime } }),
    eliminarPuesto: (p) => confirmarEliminar(`el puesto "${p.nombre}"`, () => delPuesto.mutateAsync(p.id)),
  }

  const nuevoDepto = () => setDialog({ open: true, nivel: 'departamento', mode: 'crear', parentId: empresaId })

  return (
    <div className="space-y-5">
      {/* Encabezado + filtros */}
      <FilterCard>
        <PageHeader
          titulo="Organización"
          icono="solar:structure-bold"
          descripcion="Departamentos, sub-departamentos y puestos de cada empresa. Solo se pueden eliminar las ramas que no tienen nada adentro."
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

      {/* Árbol */}
      <Panel
        title={empresaNombre ? `Estructura de ${empresaNombre}` : 'Estructura'}
        subtitle="Haz clic en un departamento o sub-departamento para ver lo que tiene adentro. Pasa el mouse sobre una fila para editarla o eliminarla."
      >
        {!empresaId ? (
          <EmptyState
            icon="solar:buildings-2-bold"
            title="Elige una empresa"
            description="Selecciona un país y una empresa arriba para ver su estructura."
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : !arbol?.length ? (
          <div className="flex flex-col items-center">
            <EmptyState
              icon="solar:folder-open-bold"
              title="Sin departamentos"
              description={`${empresaNombre ?? 'Esta empresa'} todavía no tiene departamentos. Crea el primero con el botón de abajo.`}
              className="pb-4"
            />
            <Button variant="outline" onClick={nuevoDepto} className="mb-10">
              <Icon icon="solar:add-circle-bold" width={16} />
              Crear el primero
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {arbol.map((d, i) => (
              <DepartamentoNode key={d.id} depto={d} api={api} index={i} />
            ))}
          </div>
        )}
      </Panel>

      <NodoDialog state={dialog} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} />
    </div>
  )
}

// ───────────────────────── Nodos ─────────────────────────

function Chevron({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      aria-label={open ? 'Ocultar contenido' : 'Ver contenido'}
      title={open ? 'Ocultar contenido' : 'Ver contenido'}
    >
      <Icon
        icon="solar:alt-arrow-right-bold"
        width={14}
        className={cn('transition-transform duration-200', open && 'rotate-90')}
      />
    </button>
  )
}

function Contador({ n, singular, plural }: { n: number; singular: string; plural: string }) {
  return (
    <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 tabular-nums sm:inline">
      {n} {n === 1 ? singular : plural}
    </span>
  )
}

function DepartamentoNode({ depto, api, index }: { depto: DepartamentoNodo; api: TreeApi; index: number }) {
  const open = api.openDeptos.has(depto.id)
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 overflow-hidden rounded-xl border border-slate-200 bg-white',
        open && 'shadow-sm',
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('group flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50', open && 'bg-slate-50/70')}>
        <Chevron open={open} onClick={() => api.toggleDepto(depto.id)} />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Icon icon="solar:buildings-2-bold" width={17} />
        </span>
        <button type="button" onClick={() => api.toggleDepto(depto.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-sm font-semibold text-slate-900">{depto.nombre}</span>
          {depto.codigo && (
            <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
              {depto.codigo}
            </span>
          )}
        </button>
        <Contador n={depto.subdepartamentos.length} singular="sub-depto" plural="sub-deptos" />
        <RowActions
          tipo="departamento"
          onEdit={() => api.editarDepartamento(depto)}
          onDelete={() => api.eliminarDepartamento(depto)}
        />
      </div>

      <ExpandRegion open={open}>
        <div className="ml-[1.55rem] space-y-1 border-l border-dashed border-slate-200 py-2 pl-4 pr-3">
          {depto.subdepartamentos.map((s) => (
            <SubNode key={s.id} sub={s} api={api} />
          ))}
          <AddRow label="sub-departamento" onClick={() => api.nuevoSub(depto.id)} />
        </div>
      </ExpandRegion>
    </div>
  )
}

function SubNode({ sub, api }: { sub: SubDepartamentoNodo; api: TreeApi }) {
  const open = api.openSubs.has(sub.id)
  return (
    <div>
      <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
        <Chevron open={open} onClick={() => api.toggleSub(sub.id)} />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Icon icon="solar:folder-with-files-bold" width={15} />
        </span>
        <button type="button" onClick={() => api.toggleSub(sub.id)} className="min-w-0 flex-1 text-left">
          <span className="truncate text-sm font-medium text-slate-800">{sub.nombre}</span>
        </button>
        <Contador n={sub.puestos.length} singular="puesto" plural="puestos" />
        <RowActions tipo="sub-departamento" onEdit={() => api.editarSub(sub)} onDelete={() => api.eliminarSub(sub)} />
      </div>

      <ExpandRegion open={open}>
        <div className="ml-[1.35rem] space-y-0.5 border-l border-dashed border-slate-200 pb-1 pl-4 pt-1">
          {sub.puestos.map((p) => (
            <PuestoRow key={p.id} puesto={p} api={api} />
          ))}
          <AddRow label="puesto" onClick={() => api.nuevoPuesto(sub.id)} />
        </div>
      </ExpandRegion>
    </div>
  )
}

function PuestoRow({ puesto, api }: { puesto: PuestoNodo; api: TreeApi }) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-500">
        <Icon icon="solar:case-round-bold" width={14} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{puesto.nombre}</span>
      {puesto.codigoBiotime != null && (
        <span
          className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500"
          title="Código del puesto en el reloj biométrico"
        >
          reloj {puesto.codigoBiotime}
        </span>
      )}
      <RowActions tipo="puesto" onEdit={() => api.editarPuesto(puesto)} onDelete={() => api.eliminarPuesto(puesto)} />
    </div>
  )
}

// ───────────────────────── Piezas reutilizables ─────────────────────────

function ExpandRegion({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-200 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function RowActions({ tipo, onEdit, onDelete }: { tipo: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <button
        type="button"
        onClick={onEdit}
        title={`Editar ${tipo}`}
        aria-label={`Editar ${tipo}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-600"
      >
        <Icon icon="solar:pen-bold" width={15} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title={`Eliminar ${tipo}`}
        aria-label={`Eliminar ${tipo}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
      >
        <Icon icon="solar:trash-bin-trash-bold" width={15} />
      </button>
    </div>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
    >
      <Icon icon="solar:add-circle-linear" width={15} />
      Agregar {label}
    </button>
  )
}
